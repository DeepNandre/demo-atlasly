import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required. Include it in the X-API-Key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Hash the API key for lookup (in production, use proper hashing)
    const keyHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(apiKey)
    );
    const keyHashHex = Array.from(new Uint8Array(keyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Validate API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, rate_limit, is_active')
      .eq('key_hash', keyHashHex)
      .eq('is_active', true)
      .maybeSingle();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (simplified - in production use Redis or similar)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', apiKeyData.id)
      .gte('created_at', oneHourAgo);

    if (count && count >= apiKeyData.rate_limit) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          limit: apiKeyData.rate_limit,
          reset_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the endpoint from URL path
    const url = new URL(req.url);
    const endpoint = url.pathname.replace('/api-gateway', '');
    const startTime = Date.now();

    // Route to appropriate handler
    let response: Response;
    
    if (endpoint.startsWith('/v1/analyze-site')) {
      // Forward to analyze-site function
      const { data, error } = await supabase.functions.invoke('api-analyze-site', {
        body: await req.json(),
        headers: {
          'x-user-id': apiKeyData.user_id,
        }
      });

      if (error) throw error;
      
      response = new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (endpoint.startsWith('/v1/chat')) {
      // Forward to chat function
      const { data, error } = await supabase.functions.invoke('chat', {
        body: await req.json(),
        headers: {
          'x-user-id': apiKeyData.user_id,
        }
      });

      if (error) throw error;

      response = new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      response = new Response(
        JSON.stringify({ error: 'Endpoint not found', available_endpoints: ['/v1/analyze-site', '/v1/chat'] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the request
    const responseTime = Date.now() - startTime;
    await supabase.from('api_requests').insert({
      api_key_id: apiKeyData.id,
      endpoint,
      status_code: response.status,
      response_time_ms: responseTime,
      metadata: { method: req.method, user_agent: req.headers.get('user-agent') }
    });

    // Update last_used_at
    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKeyData.id);

    return response;

  } catch (error) {
    console.error('API Gateway error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
