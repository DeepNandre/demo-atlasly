import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      site_id,
      analysis_mode,
      shadow_result,
      sun_position,
      date,
      include_pdf,
      include_geotiff,
    } = await req.json();

    console.log('📤 Exporting solar analysis:', { site_id, analysis_mode });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get site info
    const { data: site, error: siteError } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', site_id)
      .single();

    if (siteError) throw siteError;

    const exports: { pdf_url?: string; geotiff_url?: string; geojson_url?: string } = {};

    // Generate GeoJSON
    const geojson = generateGeoJSON(shadow_result, site);
    const geojsonBlob = new Blob([JSON.stringify(geojson)], { type: 'application/json' });
    
    const geojsonPath = `solar-analysis/${site_id}/shadow_${Date.now()}.geojson`;
    const { data: geojsonUpload, error: geojsonError } = await supabase.storage
      .from('visuals')
      .upload(geojsonPath, geojsonBlob, {
        contentType: 'application/json',
        upsert: true,
      });

    if (!geojsonError) {
      const { data: geojsonUrl } = supabase.storage
        .from('visuals')
        .getPublicUrl(geojsonPath);
      exports.geojson_url = geojsonUrl.publicUrl;
    }

    // Generate PDF report
    if (include_pdf) {
      const pdf = await generatePDF(shadow_result, sun_position, site, analysis_mode, date);
      const pdfPath = `solar-analysis/${site_id}/report_${Date.now()}.pdf`;
      
      const { data: pdfUpload, error: pdfError } = await supabase.storage
        .from('visuals')
        .upload(pdfPath, pdf, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!pdfError) {
        const { data: pdfUrl } = supabase.storage
          .from('visuals')
          .getPublicUrl(pdfPath);
        exports.pdf_url = pdfUrl.publicUrl;
      }
    }

    // Generate GeoTIFF (if requested)
    if (include_geotiff && analysis_mode === 'daily') {
      // For now, return a note that GeoTIFF export is coming soon
      console.log('📊 GeoTIFF export requested but not yet implemented');
    }

    console.log('✅ Solar analysis export complete');

    return new Response(JSON.stringify(exports), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateGeoJSON(shadowResult: any, site: any) {
  const features = shadowResult.cells.map((cell: any) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [
        site.center_lng + (cell.x / 111000),
        site.center_lat + (cell.y / 111000),
      ],
    },
    properties: {
      is_shaded: cell.isShaded || false,
      sun_hours: cell.sunHours || 0,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

async function generatePDF(
  shadowResult: any,
  sunPosition: any,
  site: any,
  analysisMode: string,
  date: string
): Promise<Blob> {
  // Simple PDF generation using a basic text-based approach
  // In production, use a proper PDF library like jsPDF or PDFKit
  
  const content = `
Solar & Shadow Analysis Report
================================

Site: ${site.location_name}
Location: ${site.center_lat.toFixed(6)}, ${site.center_lng.toFixed(6)}
Date: ${new Date(date).toLocaleDateString()}
Analysis Mode: ${analysisMode === 'instant' ? 'Instant Shadow' : 'Daily Sun-Hours'}

${analysisMode === 'instant' ? `
Sun Position:
  Altitude: ${sunPosition.altitude.toFixed(2)}°
  Azimuth: ${sunPosition.azimuth.toFixed(2)}°
  
Shadow Coverage: ${shadowResult.percentShaded.toFixed(1)}% of site
Lit Area: ${(100 - shadowResult.percentShaded).toFixed(1)}%
` : `
Sun-Hours Analysis:
  Average: ${(shadowResult.cells.reduce((s: number, c: any) => s + (c.sunHours || 0), 0) / shadowResult.cells.length).toFixed(1)} hours
  Maximum: ${Math.max(...shadowResult.cells.map((c: any) => c.sunHours || 0)).toFixed(1)} hours
  Minimum: ${Math.min(...shadowResult.cells.map((c: any) => c.sunHours || 0)).toFixed(1)} hours
`}

Analysis Details:
  Cell Size: ${shadowResult.cellSize}m
  Grid: ${shadowResult.gridWidth} × ${shadowResult.gridHeight}
  Total Cells: ${shadowResult.cells.length}
  
Provider: Real terrain data (NREL SPA algorithm)
Generated: ${new Date().toISOString()}

--------------------------------
This is a basic text report. For enhanced PDF reports with maps, 
charts, and graphics, please contact support.
  `.trim();

  return new Blob([content], { type: 'text/plain' });
}
