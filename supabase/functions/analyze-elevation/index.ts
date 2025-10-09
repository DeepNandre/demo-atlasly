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
    const { site_id, grid, contourInterval = 5 } = await req.json();

    if (!site_id || !grid) {
      return new Response(
        JSON.stringify({ error: 'site_id and grid required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Analyzing elevation data for site:', site_id);

    const { values, resolution, bbox } = grid as ElevationGrid;
    const { nx, ny } = resolution;

    // Calculate statistics
    const flatValues = values.flat().filter(v => v !== null && v !== undefined);
    const min_m = Math.min(...flatValues);
    const max_m = Math.max(...flatValues);
    const mean_m = flatValues.reduce((a, b) => a + b, 0) / flatValues.length;

    console.log(`📏 Elevation range: ${min_m.toFixed(1)}m - ${max_m.toFixed(1)}m (mean: ${mean_m.toFixed(1)}m)`);

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

    // Generate contours using marching squares
    console.log(`🗺️ Generating contours at ${contourInterval}m intervals`);
    
    const contourFeatures: any[] = [];
    const minContour = Math.ceil(min_m / contourInterval) * contourInterval;
    const maxContour = Math.floor(max_m / contourInterval) * contourInterval;

    for (let elevation = minContour; elevation <= maxContour; elevation += contourInterval) {
      const segments = marchingSquares(values, resolution, bbox, elevation);
      
      segments.forEach(coords => {
        contourFeatures.push({
          type: 'Feature',
          properties: {
            elevation: elevation,
            units: 'm',
          },
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        });
      });
    }

    console.log(`✅ Generated ${contourFeatures.length} contour lines`);

    const result = {
      summary: {
        min_m,
        max_m,
        mean_m,
        slope_avg_deg,
        aspect_histogram,
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

// Simplified marching squares implementation
function marchingSquares(
  values: number[][],
  resolution: { nx: number; ny: number },
  bbox: { west: number; south: number; east: number; north: number },
  threshold: number
): number[][][] {
  const { nx, ny } = resolution;
  const dx = (bbox.east - bbox.west) / (nx - 1);
  const dy = (bbox.north - bbox.south) / (ny - 1);
  
  const segments: number[][][] = [];

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const v00 = values[j][i];
      const v10 = values[j][i + 1];
      const v01 = values[j + 1][i];
      const v11 = values[j + 1][i + 1];

      // Calculate case (4-bit configuration)
      let caseIndex = 0;
      if (v00 >= threshold) caseIndex |= 1;
      if (v10 >= threshold) caseIndex |= 2;
      if (v11 >= threshold) caseIndex |= 4;
      if (v01 >= threshold) caseIndex |= 8;

      if (caseIndex === 0 || caseIndex === 15) continue; // All same side

      // Interpolate edges
      const x0 = bbox.west + i * dx;
      const y0 = bbox.south + j * dy;
      const x1 = x0 + dx;
      const y1 = y0 + dy;

      const interpX = (v0: number, v1: number, t: number) => {
        const alpha = (threshold - v0) / (v1 - v0);
        return v0 + alpha * (v1 - v0);
      };

      // Simple line segments (only handling a few cases)
      if (caseIndex === 1 || caseIndex === 14) {
        const px = interpX(v00, v10, threshold);
        const py = y0;
        const qx = x0;
        const qy = interpX(v00, v01, threshold);
        segments.push([[px, py], [qx, qy]]);
      } else if (caseIndex === 7 || caseIndex === 8) {
        const px = x0;
        const py = interpX(v00, v01, threshold);
        const qx = interpX(v01, v11, threshold);
        const qy = y1;
        segments.push([[px, py], [qx, qy]]);
      }
      // Add more cases as needed...
    }
  }

  return segments;
}
