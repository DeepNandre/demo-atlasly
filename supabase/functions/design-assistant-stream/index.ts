import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { site_request_id, question } = await req.json();
    
    if (!question || !site_request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch site data
    const { data: siteData, error: siteError } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', site_request_id)
      .single();

    if (siteError || !siteData) {
      console.error('Error fetching site:', siteError);
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load chat history
    const { data: chatHistory } = await supabase
      .from('ai_logs')
      .select('role, content')
      .eq('site_request_id', site_request_id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Extract site context
    const climateSummary = siteData.climate_summary || {};
    const location = {
      name: siteData.location_name,
      lat: siteData.center_lat,
      lng: siteData.center_lng,
      area_sqm: siteData.area_sqm
    };

    let terrainInfo = "No terrain data available.";
    if (siteData.include_terrain) {
      terrainInfo = "Site includes 3D terrain elevation data.";
    }

    let climateInsights = "";
    if (climateSummary.monthly && Array.isArray(climateSummary.monthly)) {
      const temps = climateSummary.monthly.map((m: any) => m.temp_avg);
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      climateInsights += `Temperature range: ${minTemp.toFixed(1)}°C to ${maxTemp.toFixed(1)}°C. `;
      
      const summerMonths = climateSummary.monthly.slice(5, 8);
      const summerAvg = summerMonths.reduce((sum: number, m: any) => sum + m.temp_avg, 0) / summerMonths.length;
      climateInsights += `Summer average: ${summerAvg.toFixed(1)}°C. `;
    }

    if (climateSummary.wind_rose && Array.isArray(climateSummary.wind_rose)) {
      const maxWind = climateSummary.wind_rose.reduce((max: any, curr: any) => 
        curr.speed > max.speed ? curr : max
      , climateSummary.wind_rose[0]);
      climateInsights += `Prevailing wind: ${maxWind.direction} at ${maxWind.speed.toFixed(1)} m/s. `;
    }

    const systemPrompt = `You are a design intelligence assistant helping architects optimize building design based on site-specific data.

SITE ANALYSIS:
Location: ${location.name} (${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E)
Site Area: ${location.area_sqm ? (location.area_sqm).toFixed(0) + ' m²' : 'Not calculated'}
Terrain: ${terrainInfo}

CLIMATE DATA:
${climateInsights || 'Limited climate data available.'}

YOUR ROLE:
Provide evidence-based design recommendations citing specific site data. Format responses in clear markdown with:
- **Bold headings** for key recommendations
- Bullet points for specific guidance
- Cite actual numbers from site context
- Keep responses to 2-3 concise paragraphs`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []),
      { role: "user", content: question }
    ];

    // Save user message to history
    await supabase.from('ai_logs').insert({
      site_request_id,
      role: 'user',
      content: question,
      model: 'google/gemini-2.5-flash'
    });

    console.log('Streaming via Google Gemini (streamGenerateContent) for site:', location.name);

    // Gemini streaming endpoint
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?alt=sse&key=${GOOGLE_AI_API_KEY}`;
    const promptText = `${systemPrompt}\n\nUser: ${question}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect full response for logging
    let fullResponse = "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  // Gemini SSE emits JSON objects per line; candidate content in
                  // { candidates: [ { content: { parts: [{ text: "..." }] } } ] }
                  const parsed = JSON.parse(data);
                  const parts = parsed.candidates?.[0]?.content?.parts || [];
                  const chunk = parts.map((p: any) => p.text || '').join('');
                  if (chunk) {
                    fullResponse += chunk;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Save assistant response to history
          await supabase.from('ai_logs').insert({
            site_request_id,
            role: 'assistant',
            content: fullResponse,
            model: 'google/gemini-2.0-flash-exp'
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error("Design assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
