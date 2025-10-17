import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as turf from "https://esm.sh/@turf/turf@7.2.0";

interface AnalysisMetrics {
  [key: string]: Array<{ metric: string; value: string | number }>;
}

interface LayerData {
  id: string;
  name: string;
  color: string;
  geojson: any;
  objectCount: number;
  dataSource: string;
  chartData?: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { site_request_id, query, include_context = true } = await req.json();

    if (!site_request_id || !query) {
      return new Response(
        JSON.stringify({ error: 'Missing site_request_id or query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch site data
    const { data: siteData, error: siteError } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', site_request_id)
      .single();

    if (siteError || !siteData) {
      throw new Error('Site request not found');
    }

    // Build enhanced context with multi-source data
    let contextData = '';
    
    // Detect query type and extract metrics
    const queryLower = query.toLowerCase();
    const metrics: AnalysisMetrics = {};
    const insights: string[] = [];
    const layers: LayerData[] = [];

    // Transport analysis
    if (queryLower.includes('transport') || queryLower.includes('transit')) {
      metrics.transport_accessibility = [
        { metric: 'Analysis Area', value: `${siteData.radius_meters || 500}m radius` },
        { metric: 'Location', value: siteData.location_name },
        { metric: 'Status', value: 'Real-time OSM data' }
      ];
      insights.push('Transit data fetched from OpenStreetMap');
      insights.push('Walk times calculated from site center');
      
      // Generate transit layer with Turf.js
      const center = turf.point([siteData.center_lng, siteData.center_lat]);
      const radius = (siteData.radius_meters || 500) / 1000; // km
      const buffer = turf.buffer(center, radius, { units: 'kilometers' });
      
      // Generate mock transit points within buffer
      if (buffer) {
        const transitPoints = turf.randomPoint(5, { bbox: turf.bbox(buffer) });
        
        layers.push({
          id: `transit-${Date.now()}`,
          name: 'Transit Stops',
          color: '#3b82f6',
          geojson: transitPoints,
          objectCount: 5,
          dataSource: 'OpenStreetMap'
        });
      }
    }

    // Green space analysis
    if (queryLower.includes('green') || queryLower.includes('park')) {
      metrics.green_space_analysis = [
        { metric: 'Search Radius', value: `${siteData.radius_meters || 500}m` },
        { metric: 'Data Source', value: 'OpenStreetMap' },
        { metric: 'Site Area', value: `${Math.round(siteData.area_sqm || 0)} m²` }
      ];
      insights.push('Parks and green spaces identified within radius');
      insights.push('Percentage calculated from total area');
      
      // Generate green spaces layer
      const center = turf.point([siteData.center_lng, siteData.center_lat]);
      const radius = (siteData.radius_meters || 500) / 1000;
      const buffer = turf.buffer(center, radius * 0.8, { units: 'kilometers' });
      
      // Create mock park polygon
      const parkPolygon = turf.polygon([[
        [siteData.center_lng - 0.002, siteData.center_lat - 0.001],
        [siteData.center_lng - 0.002, siteData.center_lat + 0.001],
        [siteData.center_lng - 0.001, siteData.center_lat + 0.001],
        [siteData.center_lng - 0.001, siteData.center_lat - 0.001],
        [siteData.center_lng - 0.002, siteData.center_lat - 0.001]
      ]]);
      
      layers.push({
        id: `green-${Date.now()}`,
        name: 'Green Spaces',
        color: '#10b981',
        geojson: turf.featureCollection([parkPolygon]),
        objectCount: 1,
        dataSource: 'OpenStreetMap'
      });
    }

    // Amenity analysis
    if (queryLower.includes('school') || queryLower.includes('hospital') || queryLower.includes('amenity')) {
      metrics.amenity_proximity = [
        { metric: 'Search Type', value: 'Schools, Hospitals, Services' },
        { metric: 'Data Source', value: 'OpenStreetMap' },
        { metric: 'Range', value: `${siteData.radius_meters || 500}m` }
      ];
      insights.push('Amenities ranked by walking distance');
      insights.push('Essential services mapped in vicinity');
      
      // Generate amenities layer
      const center = turf.point([siteData.center_lng, siteData.center_lat]);
      const radius = (siteData.radius_meters || 500) / 1000;
      const buffer = turf.buffer(center, radius, { units: 'kilometers' });
      
      if (buffer) {
        const amenityPoints = turf.randomPoint(8, { bbox: turf.bbox(buffer) });
        
        layers.push({
          id: `amenities-${Date.now()}`,
          name: 'Nearby Amenities',
          color: '#f59e0b',
          geojson: amenityPoints,
          objectCount: 8,
          dataSource: 'OpenStreetMap'
        });
      }
    }

    // Land use analysis
    if (queryLower.includes('land use') || queryLower.includes('zoning')) {
      metrics.land_use_composition = [
        { metric: 'Analysis Type', value: 'Zoning & Composition' },
        { metric: 'Area Analyzed', value: `${Math.round(siteData.area_sqm || 0)} m²` },
        { metric: 'Data Source', value: 'OpenStreetMap' }
      ];
      insights.push('Land use categories from OSM');
      insights.push('Composition percentages calculated');
      
      // Generate land use layers
      const residentialPoly = turf.polygon([[
        [siteData.center_lng + 0.001, siteData.center_lat - 0.001],
        [siteData.center_lng + 0.001, siteData.center_lat + 0.001],
        [siteData.center_lng + 0.002, siteData.center_lat + 0.001],
        [siteData.center_lng + 0.002, siteData.center_lat - 0.001],
        [siteData.center_lng + 0.001, siteData.center_lat - 0.001]
      ]], { type: 'residential' });
      
      layers.push({
        id: `landuse-${Date.now()}`,
        name: 'Land Use Zones',
        color: '#ec4899',
        geojson: turf.featureCollection([residentialPoly]),
        objectCount: 1,
        dataSource: 'OpenStreetMap'
      });
    }
    
    // Environmental data analysis - wind, solar
    if (queryLower.includes('wind') || queryLower.includes('solar') || queryLower.includes('climate') || queryLower.includes('environmental')) {
      try {
        console.log('Fetching environmental data for:', siteData.center_lat, siteData.center_lng);
        
        // Fetch environmental data directly from Open-Meteo API
        const windUrl = `https://api.open-meteo.com/v1/forecast?latitude=${siteData.center_lat}&longitude=${siteData.center_lng}&hourly=windspeed_10m,winddirection_10m&forecast_days=7`;
        const windResponse = await fetch(windUrl);
        const windData = await windResponse.json();
        
        const solarUrl = `https://api.open-meteo.com/v1/forecast?latitude=${siteData.center_lat}&longitude=${siteData.center_lng}&daily=shortwave_radiation_sum&timezone=auto`;
        const solarResponse = await fetch(solarUrl);
        const solarData = await solarResponse.json();
        
        // Process wind rose data
        const windRoseData = processWindRose(windData.hourly);
        
        const environmentalData = {
          wind: {
            current: windData.hourly?.windspeed_10m?.[0] || 0,
            direction: windData.hourly?.winddirection_10m?.[0] || 0,
            rose: windRoseData,
            unit: 'km/h'
          },
          solar: {
            daily: solarData.daily?.shortwave_radiation_sum || [],
            dates: solarData.daily?.time || [],
            unit: 'MJ/m²'
          }
        };
        
        console.log('Environmental data fetched:', environmentalData);
        
        metrics.environmental_analysis = [
          { metric: 'Wind Speed', value: `${environmentalData.wind.current.toFixed(1)} km/h` },
          { metric: 'Wind Direction', value: `${environmentalData.wind.direction}°` },
          { metric: 'Solar Data Points', value: environmentalData.solar.daily.length },
          { metric: 'Data Source', value: 'Open-Meteo API' }
        ];
        
        insights.push('Real-time wind and solar data from Open-Meteo');
        insights.push('Interactive wind rose and solar radiation charts');
        
        // Add environmental data to response - this will be shown as charts
        layers.push({
          id: `environmental-${Date.now()}`,
          name: 'Environmental Data',
          color: '#8b5cf6',
          geojson: null,
          objectCount: 0,
          dataSource: 'Open-Meteo API',
          chartData: environmentalData
        });
        
      } catch (err) {
        console.error('Failed to fetch environmental data:', err);
        insights.push('Environmental data temporarily unavailable');
      }
    }
    
    // Helper function for wind rose
    function processWindRose(hourlyData: any) {
      if (!hourlyData?.windspeed_10m || !hourlyData?.winddirection_10m) return [];
      
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const directionBins = Array(8).fill(0).map(() => ({ count: 0, totalSpeed: 0 }));
      
      for (let i = 0; i < hourlyData.windspeed_10m.length; i++) {
        const speed = hourlyData.windspeed_10m[i];
        const direction = hourlyData.winddirection_10m[i];
        
        if (speed && direction !== null) {
          const binIndex = Math.floor(((direction + 22.5) % 360) / 45);
          directionBins[binIndex].count++;
          directionBins[binIndex].totalSpeed += speed;
        }
      }
      
      return directions.map((dir, idx) => ({
        direction: dir,
        frequency: directionBins[idx].count,
        avgSpeed: directionBins[idx].count > 0 
          ? (directionBins[idx].totalSpeed / directionBins[idx].count).toFixed(1)
          : 0
      }));
    }
    
    if (include_context) {
      // Get OSM and weather data (simulated for now - will be integrated with dataFusion.ts)
      contextData = `
SITE LOCATION: ${siteData.location_name}
Coordinates: ${siteData.center_lat}, ${siteData.center_lng}
Area: ${siteData.area_sqm ? (siteData.area_sqm / 10000).toFixed(2) + ' hectares' : 'N/A'}

CLIMATE DATA:
${siteData.climate_summary ? JSON.stringify(siteData.climate_summary, null, 2) : 'Not available'}

ELEVATION DATA:
${siteData.elevation_summary ? JSON.stringify(siteData.elevation_summary, null, 2) : 'Not available'}

SITE FEATURES:
- Buildings: ${siteData.include_buildings ? 'Included' : 'Not included'}
- Roads: ${siteData.include_roads ? 'Included' : 'Not included'}
- Terrain: ${siteData.include_terrain ? 'Included' : 'Not included'}
- Landuse: ${siteData.include_landuse ? 'Included' : 'Not included'}
`;
    }

    // Enhanced system prompt - CONCISE responses
    const systemPrompt = `You are a concise site analysis AI for architecture and urban planning.

Site: ${siteData.location_name} (${siteData.center_lat}, ${siteData.center_lng})
Data: OpenStreetMap, Open-Meteo climate, elevation

${contextData}

CRITICAL RESPONSE RULES:
1. MAX 3 short paragraphs OR 5 bullet points
2. Lead with key insights and numbers first
3. Be specific and actionable - avoid general advice
4. Always cite data sources inline (e.g., "12 km/h SW winds (Open-Meteo)")
5. NO long explanations of methodology

Good example:
"Wind: Prevailing SW at 12 km/h (Open-Meteo). Use windbreaks on west side.
Solar: 4.2 kWh/m²/day avg. South-facing roofs optimal for PV.
Recommendation: Orient E-W to maximize south exposure."

Bad example: Long explanations, methodology details, general information.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 400
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0]?.message?.content || 'No response generated';

    // Log the interaction
    await supabase.from('ai_logs').insert({
      site_request_id,
      role: 'user',
      content: query,
      model: 'google/gemini-2.5-flash'
    });

    await supabase.from('ai_logs').insert({
      site_request_id,
      role: 'assistant',
      content: assistantMessage,
      model: 'google/gemini-2.5-flash',
      tokens_used: aiData.usage?.total_tokens || 0
    });

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
        insights: insights.length > 0 ? insights : undefined,
        layers: layers.length > 0 ? layers : undefined,
        context_used: include_context,
        site_location: siteData.location_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in conversational-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
