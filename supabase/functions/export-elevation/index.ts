import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { site_id, contours, includePdf = true } = await req.json();

    if (!site_id || !contours) {
      return new Response(
        JSON.stringify({ error: 'site_id and contours required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Exporting elevation data for site:', site_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('site_requests')
      .select('boundary_geojson, location_name, elevation_summary')
      .eq('id', site_id)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate DXF
    console.log('🔧 Generating DXF...');
    const dxfContent = generateDXF(contours, site.boundary_geojson);
    
    // Upload DXF to storage
    const dxfFileName = `${site_id}_contours.dxf`;
    const { data: dxfUpload, error: dxfError } = await supabase.storage
      .from('site-packs')
      .upload(`exports/${dxfFileName}`, new Blob([dxfContent], { type: 'application/dxf' }), {
        upsert: true,
      });

    if (dxfError) {
      console.error('DXF upload failed:', dxfError);
      throw new Error('Failed to upload DXF');
    }

    const { data: dxfUrlData } = supabase.storage
      .from('site-packs')
      .getPublicUrl(`exports/${dxfFileName}`);
    const dxf_url = dxfUrlData.publicUrl;

    let pdf_url = null;

    if (includePdf) {
      console.log('📄 Generating PDF...');
      // For PDF generation, we'd typically use a library like PDFKit or puppeteer
      // For now, create a simple SVG-based approach
      
      const pdfContent = await generatePDF(
        contours,
        site.boundary_geojson,
        site.location_name,
        site.elevation_summary
      );
      
      const pdfFileName = `${site_id}_elevation.pdf`;
      const { data: pdfUpload, error: pdfError } = await supabase.storage
        .from('site-packs')
        .upload(`exports/${pdfFileName}`, pdfContent, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!pdfError) {
        const { data: pdfUrlData } = supabase.storage
          .from('site-packs')
          .getPublicUrl(`exports/${pdfFileName}`);
        pdf_url = pdfUrlData.publicUrl;
      }
    }

    console.log('✅ Export complete');

    return new Response(
      JSON.stringify({ dxf_url, pdf_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error exporting elevation:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateDXF(contours: any, boundary: any): string {
  // Simplified DXF header
  let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Add boundary as POLYLINE
  if (boundary?.coordinates?.[0]) {
    dxf += `0\nPOLYLINE\n8\nBOUNDARY\n62\n1\n70\n1\n`;
    boundary.coordinates[0].forEach((coord: number[]) => {
      dxf += `0\nVERTEX\n8\nBOUNDARY\n10\n${coord[0]}\n20\n${coord[1]}\n`;
    });
    dxf += `0\nSEQEND\n`;
  }

  // Add contours as LINEs
  contours.features?.forEach((feature: any) => {
    const elevation = feature.properties.elevation;
    const layer = `CONTOURS_${elevation}M`;
    const coords = feature.geometry.coordinates;

    for (let i = 0; i < coords.length - 1; i++) {
      dxf += `0\nLINE\n8\n${layer}\n10\n${coords[i][0]}\n20\n${coords[i][1]}\n30\n${elevation}\n`;
      dxf += `11\n${coords[i + 1][0]}\n21\n${coords[i + 1][1]}\n31\n${elevation}\n`;
    }
  });

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

async function generatePDF(
  contours: any,
  boundary: any,
  locationName: string,
  summary: any
): Promise<string> {
  // Simple SVG-based approach (in production, use proper PDF library)
  const width = 800;
  const height = 1000;
  
  // Calculate bounds
  const allCoords: number[][] = [];
  contours.features?.forEach((f: any) => {
    allCoords.push(...f.geometry.coordinates);
  });
  
  const lons = allCoords.map(c => c[0]);
  const lats = allCoords.map(c => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  
  const scaleX = (width - 100) / (maxLon - minLon);
  const scaleY = (height - 300) / (maxLat - minLat);
  const scale = Math.min(scaleX, scaleY);
  
  const toX = (lon: number) => 50 + (lon - minLon) * scale;
  const toY = (lat: number) => height - 100 - (lat - minLat) * scale;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="white"/>
  
  <!-- Title -->
  <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold">${locationName}</text>
  <text x="400" y="50" text-anchor="middle" font-size="14">Elevation Analysis</text>
  
  <!-- North Arrow -->
  <g transform="translate(700, 100)">
    <path d="M 0,-20 L -10,10 L 0,5 L 10,10 Z" fill="red"/>
    <text x="0" y="30" text-anchor="middle" font-size="12">N</text>
  </g>
  
  <!-- Contours -->
  <g stroke="brown" stroke-width="0.5" fill="none">
`;

  contours.features?.forEach((feature: any) => {
    const coords = feature.geometry.coordinates;
    if (coords.length > 0) {
      const pathData = coords.map((c: number[], i: number) => 
        `${i === 0 ? 'M' : 'L'} ${toX(c[0])},${toY(c[1])}`
      ).join(' ');
      svg += `    <path d="${pathData}"/>\n`;
    }
  });

  svg += `  </g>
  
  <!-- Legend -->
  <g transform="translate(50, ${height - 80})">
    <text font-size="12" font-weight="bold">Elevation Summary</text>
    <text y="20" font-size="10">Min: ${summary?.min_m?.toFixed(1)}m</text>
    <text y="35" font-size="10">Max: ${summary?.max_m?.toFixed(1)}m</text>
    <text y="50" font-size="10">Mean: ${summary?.mean_m?.toFixed(1)}m</text>
    <text y="65" font-size="10">Avg Slope: ${summary?.slope_avg_deg?.toFixed(1)}°</text>
  </g>
</svg>`;

  // Return SVG as string (in production, convert to actual PDF)
  return svg;
}
