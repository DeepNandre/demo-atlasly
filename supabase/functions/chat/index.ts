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
    const { site_request_id, chat_history, user_query } = await req.json();
    
    if (!user_query || !site_request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    // Initialize Supabase client
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

    // Build context from site data
    const boundary = siteData.boundary_geojson;
    const climateSummary = siteData.climate_summary || {};
    const location = {
      name: siteData.location_name,
      lat: siteData.center_lat,
      lng: siteData.center_lng,
      area_sqm: siteData.area_sqm
    };

    // Construct system prompt with site context
    const systemPrompt = `You are an expert architectural and urban design assistant. You help architects and designers understand their site and make informed design decisions.

SITE CONTEXT:
- Location: ${location.name}
- Coordinates: ${location.lat}°N, ${location.lng}°E
- Site Area: ${location.area_sqm ? Math.round(location.area_sqm) : 'N/A'} m²
- Boundary: ${boundary ? 'Defined polygon boundary' : 'No boundary defined'}

CLIMATE DATA:
${climateSummary.monthly ? `- Monthly temperature range: ${climateSummary.monthly.map((m: any) => m.temp_avg + '°C').join(', ')}` : '- Climate data not available'}
${climateSummary.wind_rose ? `- Prevailing wind direction: Available` : ''}
${climateSummary.solar_map ? `- Solar irradiance data: Available` : ''}

SITE FEATURES:
- Buildings: ${siteData.include_buildings ? 'Included' : 'Not included'}
- Roads: ${siteData.include_roads ? 'Included' : 'Not included'}
- Terrain: ${siteData.include_terrain ? 'Included' : 'Not included'}
- Land use: ${siteData.include_landuse ? 'Included' : 'Not included'}

INSTRUCTIONS:
1. Answer questions about solar orientation, shading, wind, building placement, and climate-responsive design
2. Use the site context and climate data provided above
3. Provide specific, actionable advice when possible
4. If uncertain or lacking data, say "Based on available data..." and provide general guidance
5. For planning regulations or legal requirements, always add a caveat: "Please verify with local authorities"
6. Keep responses concise (2-3 paragraphs max) and focused on the question
7. Reference specific data points when making recommendations

EXAMPLE RESPONSES:
Q: "Which side gets most sunlight?"
A: "Based on your site location at ${location.lat}°N, the south-facing façade will receive the most direct sunlight throughout the year. This is ideal for passive solar heating in winter and will require shading devices for summer comfort."

Q: "What about wind?"
A: "Wind data is ${climateSummary.wind_rose ? 'available for your site' : 'not available'}. Generally at this latitude, prevailing winds are from the west/southwest. Consider cross-ventilation openings on these sides."

Now answer the user's questions about their site using this context.`;

    // Prepare messages for API
    const messages = [
      { role: "system", content: systemPrompt },
      ...(chat_history || []),
      { role: "user", content: user_query }
    ];

    console.log('Calling Google Gemini with generateContent');

    // Google Generative Language API (Gemini) - non-streaming generateContent
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`;

    // Concatenate system prompt and user query for a single-shot request
    const promptText = `${systemPrompt}\n\nUser: ${user_query}`;

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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const assistantMessage = (data.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p.text || '')
      .join('');

    console.log('AI response received:', assistantMessage.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        context_used: {
          location: location.name,
          has_climate: !!climateSummary.monthly,
          has_boundary: !!boundary
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
