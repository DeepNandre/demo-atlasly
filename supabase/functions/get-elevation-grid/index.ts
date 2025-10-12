import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ElevationGrid {
  resolution: { nx: number; ny: number };
  bbox: { west: number; south: number; east: number; north: number };
  values: number[][];
  provider: string;
  accuracy: { verticalErrorM: number; nominalResolutionM: number };
}

// OpenTopoData - SRTM 30m (reliable, free, global) - OPTIMIZED
async function fetchOpenTopoData(
  bbox: { west: number; south: number; east: number; north: number },
  nx: number,
  ny: number
): Promise<{ values: number[][]; stats: any } | null> {
  console.log('🗺️ Fetching from OpenTopoData SRTM30m (real terrain data)...');
  
  const dx = (bbox.east - bbox.west) / (nx - 1);
  const dy = (bbox.north - bbox.south) / (ny - 1);
  
  try {
    // Build all locations with indices
    const points: { lat: number; lon: number; index: number }[] = [];
    for (let j = 0; j < ny; j++) {
      const lat = bbox.south + j * dy;
      for (let i = 0; i < nx; i++) {
        const lon = bbox.west + i * dx;
        points.push({ lat, lon, index: j * nx + i });
      }
    }
    
    // Process in batches with parallel requests
    const BATCH_SIZE = 100;
    const PARALLEL_REQUESTS = 3; // Process 3 batches simultaneously
    const batches: typeof points[] = [];
    
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      batches.push(points.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📊 Processing ${points.length} points in ${batches.length} batches (${PARALLEL_REQUESTS} parallel)`);
    
    const allElevations: number[] = new Array(points.length).fill(0);
    let successCount = 0;
    let failCount = 0;
    
    // Process batches in parallel groups
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx += PARALLEL_REQUESTS) {
      const parallelBatches = batches.slice(batchIdx, batchIdx + PARALLEL_REQUESTS);
      
      await Promise.all(parallelBatches.map(async (batch) => {
        const locString = batch.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join('|');
        
        try {
          const response = await fetch(
            `https://api.opentopodata.org/v1/srtm30m?locations=${locString}`,
            { 
              signal: AbortSignal.timeout(15000),
              headers: { 'Accept': 'application/json' }
            }
          );
          
          if (!response.ok) {
            console.warn(`⚠️ Batch request failed: ${response.status}`);
            batch.forEach(p => {
              allElevations[p.index] = 0;
              failCount++;
            });
            return;
          }
          
          const data = await response.json();
          data.results.forEach((result: any, idx: number) => {
            const elevation = result.elevation ?? 0;
            allElevations[batch[idx].index] = elevation;
            successCount++;
          });
        } catch (error) {
          console.warn(`⚠️ Batch fetch error:`, error);
          batch.forEach(p => {
            allElevations[p.index] = 0;
            failCount++;
          });
        }
      }));
      
      // Reduced delay between parallel groups
      if (batchIdx + PARALLEL_REQUESTS < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    console.log(`✅ Fetched ${successCount}/${points.length} points (${failCount} failed)`);
    
    // Reshape into 2D array
    const values: number[][] = [];
    for (let j = 0; j < ny; j++) {
      values.push(allElevations.slice(j * nx, (j + 1) * nx));
    }
    
    // Calculate stats
    const validElevations = allElevations.filter(e => e !== 0);
    const stats = {
      min: Math.min(...validElevations),
      max: Math.max(...validElevations),
      mean: validElevations.reduce((a, b) => a + b, 0) / validElevations.length,
      validPoints: validElevations.length,
      totalPoints: allElevations.length,
    };
    
    return { values, stats };
  } catch (error) {
    console.error('❌ OpenTopoData failed:', error);
    return null;
  }
}

// USGS 3DEP (US only, high accuracy)
async function fetchUSGS3DEP(
  bbox: { west: number; south: number; east: number; north: number },
  nx: number,
  ny: number
): Promise<{ values: number[][]; stats: any } | null> {
  console.log('🗺️ Trying USGS 3DEP (US only, high accuracy)...');
  
  const dx = (bbox.east - bbox.west) / (nx - 1);
  const dy = (bbox.north - bbox.south) / (ny - 1);
  
  try {
    const values: number[][] = [];
    const allElevations: number[] = [];
    
    for (let j = 0; j < ny; j++) {
      const row: number[] = [];
      const lat = bbox.south + j * dy;
      
      for (let i = 0; i < nx; i++) {
        const lon = bbox.west + i * dx;
        
        try {
          const response = await fetch(
            `https://nationalmap.gov/epqs/pqs.php?x=${lon}&y=${lat}&units=Meters&output=json`,
            { signal: AbortSignal.timeout(5000) }
          );
          const data = await response.json();
          const elev = data.USGS_Elevation_Point_Query_Service?.Elevation_Query?.Elevation ?? 0;
          row.push(parseFloat(elev));
          allElevations.push(parseFloat(elev));
        } catch (error) {
          row.push(0);
          allElevations.push(0);
        }
        
        // Rate limiting
        if ((i + j * nx) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      values.push(row);
    }
    
    const validElevations = allElevations.filter(e => e !== 0);
    if (validElevations.length < allElevations.length * 0.5) {
      console.log('⚠️ USGS 3DEP returned too many invalid points (likely outside US)');
      return null;
    }
    
    const stats = {
      min: Math.min(...validElevations),
      max: Math.max(...validElevations),
      mean: validElevations.reduce((a, b) => a + b, 0) / validElevations.length,
      validPoints: validElevations.length,
      totalPoints: allElevations.length,
    };
    
    console.log('✅ USGS 3DEP successful');
    return { values, stats };
  } catch (error) {
    console.error('❌ USGS 3DEP failed:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 get-elevation-grid request received');
    const body = await req.json();
    console.log('📦 Request body:', JSON.stringify(body));
    
    const { site_id: siteId } = body;

    if (!siteId) {
      console.error('❌ Missing site_id in request');
      return new Response(
        JSON.stringify({ error: 'site_id parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🗻 Fetching elevation grid for site:', siteId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('site_requests')
      .select('boundary_geojson, center_lat, center_lng, radius_meters, area_sqm')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      console.error('Site not found:', siteError);
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📍 Site data:', {
      boundary_geojson: site.boundary_geojson ? 'present' : 'missing',
      center_lat: site.center_lat,
      center_lng: site.center_lng,
      radius_meters: site.radius_meters
    });

    // Calculate bbox from boundary or radius
    let bbox: { west: number; south: number; east: number; north: number };
    
    if (site.boundary_geojson?.coordinates?.[0]) {
      console.log('Using boundary_geojson for bbox');
      const coords = site.boundary_geojson.coordinates[0];
      const lons = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      bbox = {
        west: Math.min(...lons),
        south: Math.min(...lats),
        east: Math.max(...lons),
        north: Math.max(...lats),
      };
    } else {
      // Use radius to create bbox
      console.log('Using radius for bbox');
      const radiusInDegrees = (site.radius_meters || 500) / 111320; // rough conversion
      bbox = {
        west: site.center_lng - radiusInDegrees,
        south: site.center_lat - radiusInDegrees,
        east: site.center_lng + radiusInDegrees,
        north: site.center_lat + radiusInDegrees,
      };
    }

    console.log('📐 Bbox calculated:', bbox);

    // Adaptive resolution based on area
    const areaKm2 = site.area_sqm ? site.area_sqm / 1000000 : 1;
    let nx: number, ny: number;
    
    if (areaKm2 < 1) {
      nx = ny = 80; // Small sites: high resolution
    } else if (areaKm2 < 5) {
      nx = ny = 60; // Medium sites
    } else {
      nx = ny = 40; // Large sites: lower resolution to avoid timeouts
    }
    
    console.log(`📊 Grid: ${nx}×${ny} (${nx * ny} points) for ${areaKm2.toFixed(2)} km²`);

    // Try providers with automatic fallback
    let result: { values: number[][]; stats: any } | null = null;
    let provider = '';
    let accuracy = { verticalErrorM: 0, nominalResolutionM: 0 };
    
    // Check if US location (rough check)
    const isUS = bbox.west >= -125 && bbox.east <= -66 && 
                 bbox.south >= 24 && bbox.north <= 49;
    
    // 1. Try USGS 3DEP for US locations (best accuracy)
    if (isUS) {
      result = await fetchUSGS3DEP(bbox, nx, ny);
      if (result) {
        provider = 'USGS 3DEP';
        accuracy = { verticalErrorM: 0.5, nominalResolutionM: 10 };
        console.log('✅ Using USGS 3DEP (US high-accuracy data)');
      }
    }
    
    // 2. Fallback to OpenTopoData SRTM (global coverage)
    if (!result) {
      result = await fetchOpenTopoData(bbox, nx, ny);
      if (result) {
        provider = 'OpenTopoData SRTM30m';
        accuracy = { verticalErrorM: 5, nominalResolutionM: 30 };
        console.log('✅ Using OpenTopoData SRTM30m (global data)');
      }
    }
    
    if (!result) {
      throw new Error('All elevation providers failed - could not fetch real terrain data');
    }
    
    console.log(`📊 Terrain stats: min=${result.stats.min.toFixed(1)}m, max=${result.stats.max.toFixed(1)}m, mean=${result.stats.mean.toFixed(1)}m`);
    console.log(`✅ Data quality: ${result.stats.validPoints}/${result.stats.totalPoints} valid points`);

    const grid: ElevationGrid = {
      resolution: { nx, ny },
      bbox,
      values: result.values,
      provider,
      accuracy,
    };

    console.log('✅ Real elevation data complete:', { 
      nx, ny, 
      totalPoints: nx * ny,
      validPoints: result.stats.validPoints,
      provider,
      accuracy,
      elevationRange: `${result.stats.min.toFixed(1)}m - ${result.stats.max.toFixed(1)}m`
    });

    return new Response(
      JSON.stringify(grid),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error fetching elevation grid:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
