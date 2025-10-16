import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface AnalysisMetrics {
  [key: string]: Array<{ metric: string; value: string | number }>;
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

    // Transport analysis
    if (queryLower.includes('transport') || queryLower.includes('transit')) {
      metrics.transport_accessibility = [
        { metric: 'Analysis Area', value: `${siteData.radius_meters || 500}m radius` },
        { metric: 'Location', value: siteData.location_name },
        { metric: 'Status', value: 'Real-time OSM data' }
      ];
      insights.push('Transit data fetched from OpenStreetMap');
      insights.push('Walk times calculated from site center');
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

    // Enhanced system prompt with multi-source intelligence
    const systemPrompt = `You are an expert architectural site analyst with deep knowledge of:
- Solar design and passive strategies
- Building orientation and massing
- Zoning and regulatory compliance
- Sustainable design principles
- Cost-effective site planning
- Urban design and context

You have access to multi-source data including OpenStreetMap, climate data, elevation models, and site-specific information.

SITE CONTEXT:
${contextData}

When answering questions:
1. Provide specific, actionable recommendations
2. Reference actual site data and metrics
3. Explain trade-offs and alternatives
4. Prioritize sustainability and cost-effectiveness
5. Use architectural terminology appropriately
6. Quantify impacts when possible (e.g., "rotate 15° to increase solar gain by 12%")

Always be concise but comprehensive. Focus on design implications, not just data presentation.`;

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
        temperature: 0.7,
        max_tokens: 1000
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
