import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { siteRequestId } = await req.json();
    console.log('Computing climate for site:', siteRequestId);

    // Fetch site request to get location
    const { data: siteRequest, error: fetchError } = await supabase
      .from('site_requests')
      .select('center_lat, center_lng, location_name')
      .eq('id', siteRequestId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch site: ${fetchError.message}`);
    }

    const { center_lat, center_lng } = siteRequest;
    console.log('Site location:', center_lat, center_lng);

    // Fetch EPW data from Open-Meteo API (free weather data)
    // Get historical weather data for the past year
    const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${center_lat}&longitude=${center_lng}&start_date=2024-01-01&end_date=2024-12-31&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,shortwave_radiation,precipitation&timezone=auto`;
    
    console.log('Fetching weather data from Open-Meteo...');
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error(`Weather API failed: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    console.log('Weather data fetched successfully');

    // Process hourly data into monthly summaries
    const hourlyData = weatherData.hourly;
    const monthlyStats = Array(12).fill(0).map(() => ({
      tempSum: 0,
      tempMax: -Infinity,
      tempMin: Infinity,
      solarSum: 0,
      humiditySum: 0,
      windSpeeds: [] as number[],
      windDirections: [] as number[],
      count: 0,
      rainfallSum: 0
    }));

    // Process each hour
    for (let i = 0; i < hourlyData.time.length; i++) {
      const date = new Date(hourlyData.time[i]);
      const month = date.getMonth();
      
      const temp = hourlyData.temperature_2m[i];
      const humidity = hourlyData.relative_humidity_2m[i];
      const windSpeed = hourlyData.wind_speed_10m[i];
      const windDir = hourlyData.wind_direction_10m[i];
      const solar = hourlyData.shortwave_radiation[i];
      const precipitation = hourlyData.precipitation[i];

      if (temp !== null) {
        monthlyStats[month].tempSum += temp;
        monthlyStats[month].tempMax = Math.max(monthlyStats[month].tempMax, temp);
        monthlyStats[month].tempMin = Math.min(monthlyStats[month].tempMin, temp);
        monthlyStats[month].count++;
      }
      if (solar !== null) {
        monthlyStats[month].solarSum += solar;
      }
      if (humidity !== null) {
        monthlyStats[month].humiditySum += humidity;
      }
      if (windSpeed !== null && windDir !== null) {
        monthlyStats[month].windSpeeds.push(windSpeed);
        monthlyStats[month].windDirections.push(windDir);
      }
      if (precipitation !== null) {
        monthlyStats[month].rainfallSum += precipitation;
      }
    }

    // Calculate monthly averages
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly = monthlyStats.map((stats, i) => ({
      month: months[i],
      avgTemp: stats.count > 0 ? Math.round(stats.tempSum / stats.count * 10) / 10 : 0,
      maxTemp: stats.tempMax === -Infinity ? 0 : Math.round(stats.tempMax * 10) / 10,
      minTemp: stats.tempMin === Infinity ? 0 : Math.round(stats.tempMin * 10) / 10,
      solarIrradiance: stats.count > 0 ? Math.round(stats.solarSum / stats.count) : 0,
      rainfall: Math.round(stats.rainfallSum * 10) / 10 // Actual precipitation data in mm
    }));

    // Calculate wind rose (16 directions)
    const windRose: Array<{ direction: string; speed: number }> = [];
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const directionBins = Array(16).fill(0).map(() => ({ speeds: [] as number[] }));

    // Aggregate all wind data
    monthlyStats.forEach(stats => {
      stats.windDirections.forEach((dir, i) => {
        const binIndex = Math.floor(((dir + 11.25) % 360) / 22.5);
        directionBins[binIndex].speeds.push(stats.windSpeeds[i]);
      });
    });

    // Calculate average wind speed per direction
    directionBins.forEach((bin, i) => {
      const avgSpeed = bin.speeds.length > 0 
        ? bin.speeds.reduce((a, b) => a + b, 0) / bin.speeds.length 
        : 0;
      windRose.push({
        direction: directions[i],
        speed: Math.round(avgSpeed * 10) / 10
      });
    });

    // Create solar map for key days (simplified)
    const solarMap = [];
    for (let hour = 0; hour < 24; hour++) {
      // Summer solstice approximation
      const summerIrradiance = hour >= 6 && hour <= 18 
        ? Math.round(Math.sin((hour - 6) * Math.PI / 12) * 800)
        : 0;
      solarMap.push({
        hour,
        day: 'Summer Solstice',
        irradiance: summerIrradiance
      });
    }

    const climateSummary = {
      monthly,
      windRose,
      solarMap,
      dataSource: 'Open-Meteo Historical Weather API',
      computedAt: new Date().toISOString()
    };

    // Update site_requests with climate summary
    const { error: updateError } = await supabase
      .from('site_requests')
      .update({ 
        climate_summary: climateSummary
      })
      .eq('id', siteRequestId);

    if (updateError) {
      throw new Error(`Failed to update climate summary: ${updateError.message}`);
    }

    console.log('Climate summary computed and saved');

    return new Response(
      JSON.stringify({ 
        success: true, 
        climateSummary 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error computing climate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
