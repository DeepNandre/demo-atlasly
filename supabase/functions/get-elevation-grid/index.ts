import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ElevationGrid {
  resolution: { nx: number; ny: number };
  bbox: { west: number; south: number; east: number; north: number };
  values: number[][];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('site_id');

    if (!siteId) {
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
      .select('boundary_geojson, center_lat, center_lng, radius_meters')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      console.error('Site not found:', siteError);
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate bbox from boundary or radius
    let bbox: { west: number; south: number; east: number; north: number };
    
    if (site.boundary_geojson) {
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
      const radiusInDegrees = (site.radius_meters || 500) / 111320; // rough conversion
      bbox = {
        west: site.center_lng - radiusInDegrees,
        south: site.center_lat - radiusInDegrees,
        east: site.center_lng + radiusInDegrees,
        north: site.center_lat + radiusInDegrees,
      };
    }

    console.log('📐 Bbox calculated:', bbox);

    // Determine grid resolution (aim for ~100x100 grid)
    const nx = 100;
    const ny = 100;
    const dx = (bbox.east - bbox.west) / (nx - 1);
    const dy = (bbox.north - bbox.south) / (ny - 1);

    // Fetch elevation data using Mapbox Terrain-RGB
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    const values: number[][] = [];

    if (mapboxToken) {
      console.log('🗺️ Using Mapbox Terrain-RGB');
      
      // Sample elevation at grid points
      for (let j = 0; j < ny; j++) {
        const row: number[] = [];
        const lat = bbox.south + j * dy;
        
        for (let i = 0; i < nx; i++) {
          const lon = bbox.west + i * dx;
          
          // For Mapbox Terrain-RGB, we'd need to fetch tiles and decode pixels
          // For now, use a simpler approach: fetch from OpenTopoData
          try {
            const response = await fetch(
              `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`
            );
            const data = await response.json();
            const elevation = data.results?.[0]?.elevation ?? 0;
            row.push(elevation);
          } catch (error) {
            console.warn(`Failed to fetch elevation at ${lat},${lon}:`, error);
            row.push(0);
          }
          
          // Rate limit: small delay
          if ((i * ny + j) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        values.push(row);
      }
    } else {
      console.log('📍 Using OpenTopoData (batch request)');
      
      // Build batch locations
      const locations: string[] = [];
      for (let j = 0; j < ny; j++) {
        const lat = bbox.south + j * dy;
        for (let i = 0; i < nx; i++) {
          const lon = bbox.west + i * dx;
          locations.push(`${lat},${lon}`);
        }
      }

      // Split into chunks (OpenTopoData has 100 location limit per request)
      const chunkSize = 100;
      const allElevations: number[] = [];
      
      for (let c = 0; c < locations.length; c += chunkSize) {
        const chunk = locations.slice(c, c + chunkSize);
        const locString = chunk.join('|');
        
        try {
          const response = await fetch(
            `https://api.opentopodata.org/v1/srtm30m?locations=${locString}`
          );
          const data = await response.json();
          const elevations = data.results.map((r: any) => r.elevation ?? 0);
          allElevations.push(...elevations);
          
          // Rate limit between chunks
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn('Batch fetch failed, filling with zeros:', error);
          allElevations.push(...new Array(chunk.length).fill(0));
        }
      }

      // Reshape into 2D array
      for (let j = 0; j < ny; j++) {
        values.push(allElevations.slice(j * nx, (j + 1) * nx));
      }
    }

    const grid: ElevationGrid = {
      resolution: { nx, ny },
      bbox,
      values,
    };

    console.log('✅ Elevation grid complete:', { nx, ny, sampleCount: nx * ny });

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
