import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateContours, simplifyContour } from '../_shared/contourGeneration.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ElevationGrid {
  resolution: { nx: number; ny: number };
  bbox: { west: number; south: number; east: number; north: number };
  values: number[][];
  provider?: string;
  accuracy?: { verticalErrorM: number; nominalResolutionM: number };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { site_id, grid, contourInterval = 5 } = await req.json();

    if (!site_id || !grid) {
      return new Response(
        JSON.stringify({ error: 'site_id and grid required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Analyzing real elevation data for site:', site_id);
    if (grid.provider) {
      console.log(`📡 Data source: ${grid.provider} (±${grid.accuracy?.verticalErrorM || '?'}m accuracy)`);
    }

    const { values, resolution, bbox } = grid as ElevationGrid;
    const { nx, ny } = resolution;

    // Calculate statistics (filter out invalid/zero values)
    const flatValues = values.flat().filter(v => v !== null && v !== undefined && v !== 0);
    
    if (flatValues.length === 0) {
      throw new Error('No valid elevation data found');
    }
    
    const min_m = Math.min(...flatValues);
    const max_m = Math.max(...flatValues);
    const mean_m = flatValues.reduce((a, b) => a + b, 0) / flatValues.length;
    const range_m = max_m - min_m;

    console.log(`📏 Elevation: ${min_m.toFixed(1)}m - ${max_m.toFixed(1)}m (Δ${range_m.toFixed(1)}m, mean: ${mean_m.toFixed(1)}m)`);

    // Calculate slope
    const dx = (bbox.east - bbox.west) / (nx - 1);
    const dy = (bbox.north - bbox.south) / (ny - 1);
    const meterPerDegLat = 111320;
    const meterPerDegLon = 111320 * Math.cos((bbox.north + bbox.south) / 2 * Math.PI / 180);
    
    const slopes: number[] = [];
    const aspects: number[] = [];

    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const dz_dx = (values[j][i + 1] - values[j][i - 1]) / (2 * dx * meterPerDegLon);
        const dz_dy = (values[j + 1][i] - values[j - 1][i]) / (2 * dy * meterPerDegLat);
        
        const slope_rad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
        const slope_deg = slope_rad * 180 / Math.PI;
        slopes.push(slope_deg);

        const aspect_rad = Math.atan2(dz_dy, dz_dx);
        const aspect_deg = (aspect_rad * 180 / Math.PI + 90) % 360;
        aspects.push(aspect_deg);
      }
    }

    const slope_avg_deg = slopes.reduce((a, b) => a + b, 0) / slopes.length;

    // Aspect histogram (8 directions)
    const aspectBins = Array(8).fill(0);
    aspects.forEach(aspect => {
      const bin = Math.floor((aspect + 22.5) / 45) % 8;
      aspectBins[bin]++;
    });
    
    const aspect_histogram = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((dir, i) => ({
      dir: dir,
      deg: i * 45,
      pct: aspectBins[i] / aspects.length,
    }));

    // Generate contours using professional marching squares algorithm
    console.log(`🗺️ Generating contours at ${contourInterval}m intervals`);
    
    // Convert to standard grid format
    const gridForContours = {
      values,
      nx,
      ny,
      xMin: bbox.west,
      xMax: bbox.east,
      yMin: bbox.south,
      yMax: bbox.north
    };
    
    const contours = generateContours(gridForContours, contourInterval, min_m, max_m);
    
    const contourFeatures: any[] = [];
    for (const contour of contours) {
      for (const segment of contour.segments) {
        // Simplify the contour to reduce file size
        const simplified = simplifyContour(segment, 0.0001); // ~11m tolerance
        
        contourFeatures.push({
          type: 'Feature',
          properties: {
            elevation: contour.elevation,
            units: 'm',
            points: segment.length,
            simplified: simplified.length
          },
          geometry: {
            type: 'LineString',
            coordinates: simplified.map(p => [p.x, p.y]),
          },
        });
      }
    }

    console.log(`✅ Generated ${contourFeatures.length} contour lines from ${contours.length} elevations`);

    const result = {
      summary: {
        min_m,
        max_m,
        mean_m,
        range_m,
        slope_avg_deg,
        aspect_histogram,
        provider: grid.provider || 'Unknown',
        accuracy: grid.accuracy,
        data_points: flatValues.length,
      },
      contours: {
        type: 'FeatureCollection',
        features: contourFeatures,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error analyzing elevation:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
