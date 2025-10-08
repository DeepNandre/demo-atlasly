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
    const { siteRequestId } = await req.json();

    if (!siteRequestId) {
      return new Response(
        JSON.stringify({ error: 'Missing siteRequestId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch site request
    const { data: siteRequest, error: siteError } = await supabase
      .from('site_requests')
      .select('*, user_id')
      .eq('id', siteRequestId)
      .single();

    if (siteError || !siteRequest) {
      throw new Error('Site request not found');
    }

    // Skip if email already sent
    if (siteRequest.email_sent) {
      return new Response(
        JSON.stringify({ message: 'Email already sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email
    if (!siteRequest.user_id) {
      console.log('No user_id, skipping email');
      return new Response(
        JSON.stringify({ message: 'No user associated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userData } = await supabase.auth.admin.getUserById(siteRequest.user_id);
    if (!userData?.user?.email) {
      throw new Error('User email not found');
    }

    const previewUrl = `${Deno.env.get('SUPABASE_URL')?.replace('mugtabvbojomcgdrxfli', 'app')}/preview/${siteRequestId}`;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SitePack <noreply@yourdomain.com>',
        to: [userData.user.email],
        subject: `Your site pack for ${siteRequest.location_name} is ready!`,
        html: `
          <h1>🎉 Your Site Pack is Ready!</h1>
          <p>We've finished processing your site pack for <strong>${siteRequest.location_name}</strong>.</p>
          
          <h2>What's included:</h2>
          <ul>
            ${siteRequest.include_buildings ? '<li>✅ Building footprints</li>' : ''}
            ${siteRequest.include_roads ? '<li>✅ Road network</li>' : ''}
            ${siteRequest.include_terrain ? '<li>✅ Terrain elevation data</li>' : ''}
          </ul>

          <p>
            <a href="${previewUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              View Your Site Pack →
            </a>
          </p>

          <p style="color: #666; font-size: 14px; margin-top: 32px;">
            This is an automated notification. The link expires in 7 days.
          </p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', emailResponse.status, errorText);
      throw new Error('Failed to send email');
    }

    // Mark email as sent
    await supabase
      .from('site_requests')
      .update({ email_sent: true })
      .eq('id', siteRequestId);

    console.log('Email sent successfully to:', userData.user.email);

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
