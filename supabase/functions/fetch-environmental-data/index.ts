import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { site_request_id, lat, lng, data_types = ['wind', 'solar'] } = await req.json();

    if (!site_request_id || !lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache first
    const { data: cached } = await supabase
      .from('environmental_data')
      .select('*')
      .eq('site_request_id', site_request_id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (cached && cached.length > 0) {
      console.log('Using cached environmental data');
      return new Response(
        JSON.stringify({ data: cached[0].data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const environmentalData: any = {};

    // Fetch wind data from Open-Meteo (free, no API key needed)
    if (data_types.includes('wind')) {
      try {
        const windUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=windspeed_10m,winddirection_10m&forecast_days=7`;
        const windResponse = await fetch(windUrl);
        const windData = await windResponse.json();

        // Process wind data into wind rose format
        const windRoseData = processWindRose(windData.hourly);
        environmentalData.wind = {
          current: windData.hourly?.windspeed_10m?.[0] || 0,
          direction: windData.hourly?.winddirection_10m?.[0] || 0,
          rose: windRoseData,
          unit: 'km/h'
        };
      } catch (err) {
        console.error('Wind data fetch error:', err);
        environmentalData.wind = { error: 'Failed to fetch wind data' };
      }
    }

    // Fetch solar radiation data from Open-Meteo
    if (data_types.includes('solar')) {
      try {
        const solarUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=shortwave_radiation_sum&timezone=auto`;
        const solarResponse = await fetch(solarUrl);
        const solarData = await solarResponse.json();

        environmentalData.solar = {
          daily: solarData.daily?.shortwave_radiation_sum || [],
          dates: solarData.daily?.time || [],
          unit: 'MJ/m²'
        };
      } catch (err) {
        console.error('Solar data fetch error:', err);
        environmentalData.solar = { error: 'Failed to fetch solar data' };
      }
    }

    // Fetch temperature data
    if (data_types.includes('temperature')) {
      try {
        const tempUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
        const tempResponse = await fetch(tempUrl);
        const tempData = await tempResponse.json();

        environmentalData.temperature = {
          max: tempData.daily?.temperature_2m_max || [],
          min: tempData.daily?.temperature_2m_min || [],
          dates: tempData.daily?.time || [],
          unit: '°C'
        };
      } catch (err) {
        console.error('Temperature data fetch error:', err);
        environmentalData.temperature = { error: 'Failed to fetch temperature data' };
      }
    }

    // Cache the results for 7 days
    await supabase.from('environmental_data').insert({
      site_request_id,
      data_type: data_types.join(','),
      data: environmentalData,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    return new Response(
      JSON.stringify({ data: environmentalData, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-environmental-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to process wind data into wind rose format
function processWindRose(hourlyData: any) {
  if (!hourlyData?.windspeed_10m || !hourlyData?.winddirection_10m) {
    return [];
  }

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
