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
    const url = new URL(req.url);
    const siteRequestId = url.pathname.split('/').pop();
    const userId = req.headers.get('x-user-id');

    if (!siteRequestId) {
      return new Response(
        JSON.stringify({ error: 'site_request_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the site request
    const { data: siteRequest, error } = await supabase
      .from('site_requests')
      .select('id, status, progress, location_name, center_lat, center_lng, radius_meters, file_url, preview_image_url, error_message, created_at, completed_at')
      .eq('id', siteRequestId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!siteRequest) {
      return new Response(
        JSON.stringify({ error: 'Site request not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the site request status
    return new Response(
      JSON.stringify({
        id: siteRequest.id,
        status: siteRequest.status,
        progress: siteRequest.progress,
        location: {
          name: siteRequest.location_name,
          latitude: siteRequest.center_lat,
          longitude: siteRequest.center_lng,
          radius_meters: siteRequest.radius_meters,
        },
        file_url: siteRequest.file_url,
        preview_image_url: siteRequest.preview_image_url,
        error_message: siteRequest.error_message,
        created_at: siteRequest.created_at,
        completed_at: siteRequest.completed_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API get-site-status error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
