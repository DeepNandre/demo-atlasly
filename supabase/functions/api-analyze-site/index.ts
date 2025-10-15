import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 500, boundary } = await req.json();
    const userId = req.headers.get('x-user-id');

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a site request (reuse existing process-site-request logic)
    const boundaryGeoJSON = boundary || {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      properties: {}
    };

    const { data: siteRequest, error: insertError } = await supabase
      .from('site_requests')
      .insert({
        user_id: userId,
        location_name: `API Request (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        center_lat: latitude,
        center_lng: longitude,
        radius_meters: radius,
        boundary_geojson: boundaryGeoJSON,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Trigger the processing function
    const { error: processError } = await supabase.functions.invoke('process-site-request', {
      body: { site_request_id: siteRequest.id }
    });

    if (processError) {
      console.error('Process error:', processError);
    }

    // Return the site request ID for polling
    return new Response(
      JSON.stringify({
        site_request_id: siteRequest.id,
        status: 'processing',
        message: 'Site analysis started. Poll /v1/site/{site_request_id} for results.',
        estimated_time_seconds: 30
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API analyze-site error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
