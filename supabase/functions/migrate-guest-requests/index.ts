import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrateRequest {
  clientId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { clientId } = await req.json() as MigrateRequest;

    if (!clientId) {
      throw new Error('Client ID is required');
    }

    console.log(`Migrating guest requests for client_id: ${clientId} to user_id: ${user.id}`);

    // Update all site requests with matching client_id to have the user_id
    const { data, error } = await supabase
      .from('site_requests')
      .update({ user_id: user.id })
      .eq('client_id', clientId)
      .is('user_id', null)
      .select();

    if (error) {
      throw error;
    }

    console.log(`Migrated ${data?.length || 0} site requests`);

    return new Response(
      JSON.stringify({
        success: true,
        migratedCount: data?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Migration error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
