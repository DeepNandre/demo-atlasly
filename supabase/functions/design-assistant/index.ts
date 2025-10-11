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

    // Extract site context
    const boundary = siteData.boundary_geojson;
    const climateSummary = siteData.climate_summary || {};
    const location = {
      name: siteData.location_name,
      lat: siteData.center_lat,
      lng: siteData.center_lng,
      area_sqm: siteData.area_sqm
    };

    // Calculate terrain analysis if available
    let terrainInfo = "No terrain data available.";
    if (siteData.include_terrain) {
      terrainInfo = "Site includes 3D terrain elevation data.";
    }

    // Extract climate insights
    let climateInsights = "";
    if (climateSummary.monthly && Array.isArray(climateSummary.monthly)) {
      const temps = climateSummary.monthly.map((m: any) => m.temp_avg);
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      climateInsights += `Temperature range: ${minTemp.toFixed(1)}°C to ${maxTemp.toFixed(1)}°C. `;
      
      const summerMonths = climateSummary.monthly.slice(5, 8); // June-Aug in Northern Hemisphere
      const summerAvg = summerMonths.reduce((sum: number, m: any) => sum + m.temp_avg, 0) / summerMonths.length;
      climateInsights += `Summer average: ${summerAvg.toFixed(1)}°C. `;
    }

    if (climateSummary.wind_rose && Array.isArray(climateSummary.wind_rose)) {
      const maxWind = climateSummary.wind_rose.reduce((max: any, curr: any) => 
        curr.speed > max.speed ? curr : max
      , climateSummary.wind_rose[0]);
      climateInsights += `Prevailing wind: ${maxWind.direction} at ${maxWind.speed.toFixed(1)} m/s. `;
    }

    if (climateSummary.monthly && Array.isArray(climateSummary.monthly)) {
      const solarData = climateSummary.monthly.map((m: any) => m.solar_kwh_m2 || 0);
      const totalSolar = solarData.reduce((a: number, b: number) => a + b, 0);
      climateInsights += `Annual solar irradiance: ${totalSolar.toFixed(0)} kWh/m². `;
    }

    // Build detailed system prompt
    const systemPrompt = `You are a design intelligence assistant helping architects optimize building design based on site-specific data.

SITE ANALYSIS:
Location: ${location.name} (${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E)
Site Area: ${location.area_sqm ? (location.area_sqm).toFixed(0) + ' m²' : 'Not calculated'}
Terrain: ${terrainInfo}

CLIMATE DATA:
${climateInsights || 'Limited climate data available.'}

SITE FEATURES:
${siteData.include_buildings ? '✓ Building footprints mapped' : '✗ No building data'}
${siteData.include_roads ? '✓ Road network mapped' : '✗ No road data'}
${siteData.include_terrain ? '✓ Terrain elevation data' : '✗ No terrain data'}

YOUR ROLE:
You provide evidence-based design recommendations citing specific site data. Always:
1. Reference actual numbers from the site context (temperatures, solar values, wind speeds)
2. Explain WHY a recommendation matters (comfort, energy, code compliance)
3. Give specific dimensional guidance when possible (e.g., "2.5m overhang" not just "add shading")
4. Note limitations: "Based on available data..." when climate info is partial
5. Keep responses to 2-3 concise paragraphs

EXAMPLE CITATIONS:
- "Your site at ${location.lat.toFixed(1)}°N receives peak solar gain on south-facing surfaces..."
- "With prevailing winds from [direction] at [speed] m/s, consider natural ventilation..."
- "Summer temperatures average [X]°C, requiring [specific strategy]..."

Now answer the user's design question with specific, cited recommendations.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ];

    console.log('Calling Google Gemini (generateContent) for site:', location.name);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`;
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
    const recommendation = (data.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p.text || '')
      .join('');

    console.log('Design recommendation generated:', recommendation.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({
        recommendation: recommendation,
        site_context: {
          location: location.name,
          has_climate: !!climateSummary.monthly,
          has_terrain: siteData.include_terrain
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Design assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
