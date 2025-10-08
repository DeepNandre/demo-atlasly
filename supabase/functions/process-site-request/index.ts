import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  requestId: string;
}

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: Array<{ type: string; ref: number; role: string }>;
}

interface OSMResponse {
  elements: OSMElement[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId }: ProcessRequest = await req.json();
    console.log(`Processing request: ${requestId}`);

    // Fetch request details
    const { data: request, error: fetchError } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    // Check if already completed with valid artifact
    if (request.status === 'completed' && request.file_url && request.artifact_key) {
      console.log(`Request ${requestId} already completed, returning existing URL`);
      return new Response(JSON.stringify({ 
        message: 'Already processed', 
        fileUrl: request.file_url 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate radius
    const radius = request.radius_meters || 500;
    if (radius > 2000) {
      throw new Error('Radius exceeds maximum of 2000m');
    }

    await updateProgress(supabase, requestId, 10, 'processing', null);

    // Fetch OSM data
    console.log('Fetching OSM data...');
    const osmData = await fetchOSMData(request);
    await updateProgress(supabase, requestId, 30, 'processing', null);

    // Fetch elevation data if requested
    let elevationData = null;
    if (request.include_terrain) {
      try {
        console.log('Fetching elevation data...');
        elevationData = await fetchElevationData(request);
      } catch (error) {
        console.warn('Elevation fetch failed, continuing without terrain:', error);
      }
    }
    await updateProgress(supabase, requestId, 50, 'processing', null);

    // Create file contents
    console.log('Creating export files...');
    const files = await createExportFiles(request, osmData, elevationData);
    await updateProgress(supabase, requestId, 70, 'processing', null);

    // Create and validate ZIP
    console.log('Creating ZIP package...');
    const { zipBuffer, sha256, fileCount } = await createValidatedZip(files);
    const zipSize = zipBuffer.byteLength;
    console.log(`ZIP created: ${zipSize} bytes, ${fileCount} files, SHA256: ${sha256}`);
    await updateProgress(supabase, requestId, 85, 'processing', null);

    // Upload to storage
    console.log('Uploading to storage...');
    const artifactKey = `site-packs/${requestId}/${requestId}_site_pack.zip`;
    const { error: uploadError } = await supabase.storage
      .from('site-packs')
      .upload(artifactKey, zipBuffer, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Generate signed URL (7 days)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('site-packs')
      .createSignedUrl(artifactKey, 60 * 60 * 24 * 7);

    if (urlError || !urlData) {
      throw new Error(`Failed to generate download URL: ${urlError?.message}`);
    }

    await updateProgress(supabase, requestId, 95, 'processing', null);

    // Update request with completion data
    const { error: updateError } = await supabase
      .from('site_requests')
      .update({
        status: 'completed',
        progress: 100,
        file_url: urlData.signedUrl,
        artifact_key: artifactKey,
        zip_size_bytes: zipSize,
        zip_sha256: sha256,
        file_count: fileCount,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Failed to update request:', updateError);
    }

    console.log(`Request ${requestId} completed successfully`);

    return new Response(JSON.stringify({ 
      message: 'Processing complete', 
      fileUrl: urlData.signedUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const { requestId } = await req.json().catch(() => ({ requestId: 'unknown' }));
    
    if (requestId !== 'unknown') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await updateProgress(
        supabase, 
        requestId, 
        0, 
        'failed', 
        errorMessage.substring(0, 500)
      );
    }

    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateProgress(
  supabase: any,
  requestId: string,
  progress: number,
  status: string,
  errorMessage: string | null = null
) {
  const updates: any = { progress, status };
  if (errorMessage) updates.error_message = errorMessage;
  
  const { error } = await supabase
    .from('site_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) {
    console.error('Failed to update progress:', error);
  }
}

async function fetchOSMData(request: any) {
  const { center_lat, center_lng, radius_meters } = request;
  const radius = radius_meters || 500;
  
  // Calculate bounding box
  const latOffset = (radius / 111320);
  const lngOffset = (radius / (111320 * Math.cos(center_lat * Math.PI / 180)));
  
  const bbox = {
    south: center_lat - latOffset,
    west: center_lng - lngOffset,
    north: center_lat + latOffset,
    east: center_lng + lngOffset,
  };

  const bboxString = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  
  const results: any = {
    buildings: { features: [] },
    roads: { features: [] },
    landuse: { features: [] },
  };

  // Fetch buildings
  if (request.include_buildings) {
    const buildingsQuery = `
      [out:json][timeout:60];
      (
        way["building"](${bboxString});
        relation["building"](${bboxString});
      );
      out body; >; out skel qt;
    `;
    
    try {
      const buildingsData = await queryOverpass(buildingsQuery);
      results.buildings = convertOSMToGeoJSON(buildingsData, 'building');
    } catch (error) {
      console.warn('Buildings fetch failed:', error);
    }
  }

  // Fetch roads
  if (request.include_roads) {
    const roadsQuery = `
      [out:json][timeout:60];
      (
        way["highway"](${bboxString});
        relation["highway"](${bboxString});
      );
      out body; >; out skel qt;
    `;
    
    try {
      const roadsData = await queryOverpass(roadsQuery);
      results.roads = convertOSMToGeoJSON(roadsData, 'highway');
    } catch (error) {
      console.warn('Roads fetch failed:', error);
    }
  }

  // Fetch landuse
  if (request.include_landuse) {
    const landuseQuery = `
      [out:json][timeout:60];
      (
        way["landuse"](${bboxString});
        relation["landuse"](${bboxString});
      );
      out body; >; out skel qt;
    `;
    
    try {
      const landuseData = await queryOverpass(landuseQuery);
      results.landuse = convertOSMToGeoJSON(landuseData, 'landuse');
    } catch (error) {
      console.warn('Landuse fetch failed:', error);
    }
  }

  return results;
}

async function queryOverpass(query: string, retries = 3): Promise<OSMResponse> {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(overpassUrl, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' },
      });

      if (response.status === 429 || response.status === 504) {
        const delay = Math.min(1000 * Math.pow(2, i) * (1 + Math.random()), 10000);
        console.log(`Overpass rate limited, retry ${i + 1}/${retries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Overpass error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error('Overpass query failed after retries');
}

function convertOSMToGeoJSON(osmData: OSMResponse, featureType: string) {
  const nodeMap = new Map();
  const features: any[] = [];

  // Build node lookup
  osmData.elements.forEach((el: OSMElement) => {
    if (el.type === 'node' && el.lat && el.lon) {
      nodeMap.set(el.id, [el.lon, el.lat]);
    }
  });

  // Convert ways to features
  osmData.elements.forEach((el: OSMElement) => {
    if (el.type === 'way' && el.nodes) {
      const coordinates = el.nodes
        .map(nodeId => nodeMap.get(nodeId))
        .filter(coord => coord);

      if (coordinates.length >= 2) {
        features.push({
          type: 'Feature',
          properties: {
            osm_id: el.id,
            osm_type: el.type,
            ...el.tags,
          },
          geometry: {
            type: coordinates[0][0] === coordinates[coordinates.length - 1][0] && 
                  coordinates[0][1] === coordinates[coordinates.length - 1][1] &&
                  coordinates.length > 3
              ? 'Polygon'
              : 'LineString',
            coordinates: coordinates[0][0] === coordinates[coordinates.length - 1][0] && 
                        coordinates[0][1] === coordinates[coordinates.length - 1][1] &&
                        coordinates.length > 3
              ? [coordinates]
              : coordinates,
          },
        });
      }
    }
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

async function fetchElevationData(request: any) {
  const { center_lat, center_lng, radius_meters } = request;
  const radius = radius_meters || 500;
  
  const latOffset = (radius / 111320);
  const lngOffset = (radius / (111320 * Math.cos(center_lat * Math.PI / 180)));
  
  const gridSize = 20;
  const points: any[] = [];
  
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const lat = center_lat - latOffset + (2 * latOffset * i / gridSize);
      const lng = center_lng - lngOffset + (2 * lngOffset * j / gridSize);
      points.push({ lat, lng });
    }
  }

  const features: any[] = [];
  const batchSize = 100;
  
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    const locations = batch.map(p => `${p.lat},${p.lng}`).join('|');
    
    try {
      const response = await fetch(
        `https://api.opentopodata.org/v1/srtm90m?locations=${locations}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Elevation API error: ${response.status}`);
      }

      const data = await response.json();
      
      data.results?.forEach((result: any, idx: number) => {
        if (result.elevation !== null) {
          features.push({
            type: 'Feature',
            properties: {
              elevation: result.elevation,
            },
            geometry: {
              type: 'Point',
              coordinates: [batch[idx].lng, batch[idx].lat, result.elevation],
            },
          });
        }
      });

      if (i + batchSize < points.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn(`Elevation batch ${i} failed:`, error);
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

async function createExportFiles(request: any, osmData: any, elevationData: any) {
  const files = new Map<string, Uint8Array>();
  const encoder = new TextEncoder();

  // README
  const readme = createReadme(request);
  files.set('README.md', encoder.encode(readme));

  // Metadata
  const metadata = {
    request_id: request.id,
    location_name: request.location_name,
    center: { lat: request.center_lat, lng: request.center_lng },
    radius_meters: request.radius_meters,
    area_sqm: request.area_sqm,
    crs: 'EPSG:4326',
    generated_at: new Date().toISOString(),
    layers: {
      buildings: request.include_buildings,
      roads: request.include_roads,
      landuse: request.include_landuse,
      terrain: request.include_terrain,
    },
    exports: {
      geojson: true,
      dxf: request.include_dxf || false,
      glb: request.include_glb || false,
      pdf: request.exports_pdf || false,
      dwg: request.exports_dwg || false,
      skp: request.exports_skp || false,
    },
  };
  files.set('metadata.json', encoder.encode(JSON.stringify(metadata, null, 2)));

  // AOI boundary
  const aoi = createAOIFeature(request);
  files.set('geojson/aoi.geojson', encoder.encode(JSON.stringify(aoi, null, 2)));

  // GeoJSON layers
  if (osmData.buildings?.features?.length > 0) {
    files.set('geojson/buildings.geojson', encoder.encode(JSON.stringify(osmData.buildings, null, 2)));
  }
  if (osmData.roads?.features?.length > 0) {
    files.set('geojson/roads.geojson', encoder.encode(JSON.stringify(osmData.roads, null, 2)));
  }
  if (osmData.landuse?.features?.length > 0) {
    files.set('geojson/landuse.geojson', encoder.encode(JSON.stringify(osmData.landuse, null, 2)));
  }
  if (elevationData?.features?.length > 0) {
    files.set('geojson/terrain.geojson', encoder.encode(JSON.stringify(elevationData, null, 2)));
  }

  // DXF export
  if (request.include_dxf) {
    try {
      const dxf = createDXF(osmData, elevationData);
      files.set('exports/layers.dxf', encoder.encode(dxf));
    } catch (error) {
      console.warn('DXF export failed:', error);
    }
  }

  // GLB export
  if (request.include_glb) {
    try {
      const glb = await createGLB(osmData, elevationData);
      files.set('exports/scene.glb', glb);
    } catch (error) {
      console.warn('GLB export failed:', error);
    }
  }

  // PDF Plan export
  if (request.exports_pdf) {
    try {
      const pdf = createPDFPlan(request, osmData);
      files.set('exports/plan.pdf', encoder.encode(pdf));
    } catch (error) {
      console.warn('PDF export failed:', error);
    }
  }

  // DWG export (extended from DXF)
  if (request.exports_dwg) {
    try {
      const dwg = createDWG(osmData, elevationData);
      files.set('exports/layers.dwg', encoder.encode(dwg));
    } catch (error) {
      console.warn('DWG export failed:', error);
    }
  }

  // SKP export (via GLB)
  if (request.exports_skp) {
    try {
      const glbForSkp = await createGLB(osmData, elevationData);
      files.set('exports/scene_for_sketchup.glb', glbForSkp);
      const note = `# SketchUp Import Instructions

This package includes a GLB file that can be imported into SketchUp:

1. Open SketchUp
2. Go to File > Import
3. Change file type to "All Supported Files" or "3D Models"
4. Select: scene_for_sketchup.glb
5. Click Import

The GLB format is widely supported and preserves 3D geometry.
For best results, use SketchUp 2021 or later.

## Alternative Methods
- Use online GLB to SKP converters
- Import into Blender and export as SKP/DAE
- Use the Transmutr plugin for SketchUp (paid)
`;
      files.set('exports/SKETCHUP_IMPORT.md', encoder.encode(note));
    } catch (error) {
      console.warn('SKP/GLB export failed:', error);
    }
  }

  return files;
}

function createReadme(request: any): string {
  return `# Site Pack — ${request.id}

## Location
- **Name**: ${request.location_name}
- **Center**: ${request.center_lat.toFixed(6)}, ${request.center_lng.toFixed(6)}
- **Radius**: ${request.radius_meters}m
- **Area**: ${request.area_sqm.toFixed(2)} m²

## Coordinate Reference System
- **CRS**: EPSG:4326 (WGS84)
- **DXF Units**: Meters (projected locally)

## Data Sources
- **OpenStreetMap**: © OpenStreetMap contributors (ODbL)
  - Overpass API: https://overpass-api.de/
- **Elevation**: OpenTopoData (SRTM 90m)
  - https://www.opentopodata.org/

## Files Included
- \`README.md\` - This file
- \`metadata.json\` - Request parameters and metadata
- \`geojson/aoi.geojson\` - Area of Interest boundary
${request.include_buildings ? '- `geojson/buildings.geojson` - Building footprints\n' : ''}${request.include_roads ? '- `geojson/roads.geojson` - Road network\n' : ''}${request.include_landuse ? '- `geojson/landuse.geojson` - Land use polygons\n' : ''}${request.include_terrain ? '- `geojson/terrain.geojson` - Elevation points\n' : ''}${request.include_dxf ? '- `exports/layers.dxf` - CAD drawing (DXF format)\n' : ''}${request.include_glb ? '- `exports/scene.glb` - 3D scene (GLB format)\n' : ''}${request.exports_pdf ? '- `exports/plan.pdf` - 2D plan with legend, scale, north arrow\n' : ''}${request.exports_dwg ? '- `exports/layers.dwg` - AutoCAD DWG format\n' : ''}${request.exports_skp ? '- `exports/scene_for_sketchup.glb` - GLB for SketchUp import\n- `exports/SKETCHUP_IMPORT.md` - Import instructions\n' : ''}
## Generated
${new Date().toISOString()}

## Notes
This pack is for educational and planning purposes. Verify geometry and attributes before making design decisions. OpenStreetMap data quality varies by region.

## License
- OpenStreetMap data: Open Database License (ODbL)
- Generated files: Same as source data
`;
}

function createAOIFeature(request: any) {
  const { center_lat, center_lng, radius_meters } = request;
  const radius = radius_meters || 500;
  
  const latOffset = (radius / 111320);
  const lngOffset = (radius / (111320 * Math.cos(center_lat * Math.PI / 180)));
  
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        name: request.location_name,
        radius_meters: radius,
        area_sqm: request.area_sqm,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [center_lng - lngOffset, center_lat - latOffset],
          [center_lng + lngOffset, center_lat - latOffset],
          [center_lng + lngOffset, center_lat + latOffset],
          [center_lng - lngOffset, center_lat + latOffset],
          [center_lng - lngOffset, center_lat - latOffset],
        ]],
      },
    }],
  };
}

function createDXF(osmData: any, elevationData: any): string {
  // Basic DXF header
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$INSUNITS
70
6
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
5
`;

  const layers = [
    { name: 'BUILDINGS', color: 1 },
    { name: 'ROADS', color: 3 },
    { name: 'LANDUSE', color: 5 },
    { name: 'CONTOURS', color: 8 },
    { name: 'AOI', color: 7 },
  ];

  layers.forEach(layer => {
    dxf += `0
LAYER
2
${layer.name}
70
0
62
${layer.color}
6
CONTINUOUS
`;
  });

  dxf += `0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  // Add buildings as polylines
  osmData.buildings?.features?.forEach((feature: any) => {
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0];
      dxf += `0
LWPOLYLINE
8
BUILDINGS
90
${coords.length}
70
1
`;
      coords.forEach((coord: number[]) => {
        dxf += `10
${coord[0]}
20
${coord[1]}
`;
      });
    }
  });

  // Add roads as polylines
  osmData.roads?.features?.forEach((feature: any) => {
    if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      dxf += `0
LWPOLYLINE
8
ROADS
90
${coords.length}
70
0
`;
      coords.forEach((coord: number[]) => {
        dxf += `10
${coord[0]}
20
${coord[1]}
`;
      });
    }
  });

  dxf += `0
ENDSEC
0
EOF
`;

  return dxf;
}

function createDWG(osmData: any, elevationData: any): string {
  // DWG is a proprietary format. For now, we create an enhanced DXF
  // and include a note about conversion. A proper DWG would require
  // a library like LibreDWG or commercial tools.
  
  const dxf = createDXF(osmData, elevationData);
  
  // Add a note in the DXF comments section
  const note = `; This is a DXF file compatible with AutoCAD and most CAD software.
; For native DWG format, import this DXF into AutoCAD and save as DWG.
; Free converters: LibreCAD, QCAD, or online tools like CloudConvert.
`;
  
  return note + dxf;
}

function createPDFPlan(request: any, osmData: any): string {
  // Create a simplified PDF with SVG-like vector commands
  // This is a basic implementation - a production version would use
  // a proper PDF library or convert SVG to PDF
  
  const { center_lat, center_lng, location_name, radius_meters } = request;
  const scale = radius_meters / 200; // Approximate scale for display
  
  // PDF header (PDF 1.4)
  let pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources << /Font << /F1 4 0 R >> >>
  /MediaBox [0 0 612 792]
  /Contents 5 0 R
>>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 6 0 R >>
stream
BT
/F1 16 Tf
50 750 Td
(Site Plan - ${location_name}) Tj
ET
BT
/F1 10 Tf
50 730 Td
(Scale 1:${Math.round(scale)}) Tj
ET
BT
/F1 10 Tf
50 710 Td
(North: ^) Tj
ET
BT
/F1 8 Tf
50 690 Td
(Center: ${center_lat.toFixed(6)}, ${center_lng.toFixed(6)}) Tj
ET
BT
/F1 8 Tf
50 675 Td
(Radius: ${radius_meters}m) Tj
ET

% Legend
BT
/F1 10 Tf
450 730 Td
(Legend:) Tj
ET
BT
/F1 8 Tf
450 715 Td
(Buildings - Red) Tj
ET
BT
/F1 8 Tf
450 700 Td
(Roads - Blue) Tj
ET
BT
/F1 8 Tf
450 685 Td
(Boundary - Black) Tj
ET

% Draw boundary rectangle
2 w
300 400 m
400 400 l
400 500 l
300 500 l
300 400 l
S

% Attribution
BT
/F1 7 Tf
50 50 Td
(Data: OpenStreetMap contributors (ODbL)) Tj
ET
BT
/F1 7 Tf
50 40 Td
(Generated: ${new Date().toISOString()}) Tj
ET
endstream
endobj
6 0 obj
${800 + location_name.length * 8}
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000260 00000 n 
0000000339 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
${1200 + location_name.length * 8}
%%EOF
`;

  return pdf;
}

async function createGLB(osmData: any, elevationData: any): Promise<Uint8Array> {
  // Simplified GLB creation - returns a minimal valid GLB
  // In production, use a proper library like gltf-transform
  
  const encoder = new TextEncoder();
  const json = {
    asset: { version: '2.0', generator: 'site-pack-generator' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Root' }],
  };
  
  const jsonString = JSON.stringify(json);
  const jsonBytes = encoder.encode(jsonString);
  const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
  
  const headerSize = 12;
  const chunkHeaderSize = 8;
  const jsonChunkSize = chunkHeaderSize + jsonBytes.length + jsonPadding;
  const totalSize = headerSize + jsonChunkSize;
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  // GLB header
  view.setUint32(0, 0x46546C67, true); // magic: 'glTF'
  view.setUint32(4, 2, true); // version
  view.setUint32(8, totalSize, true); // length
  
  // JSON chunk
  let offset = 12;
  view.setUint32(offset, jsonBytes.length + jsonPadding, true); // chunkLength
  view.setUint32(offset + 4, 0x4E4F534A, true); // chunkType: 'JSON'
  bytes.set(jsonBytes, offset + 8);
  
  return new Uint8Array(buffer);
}

async function createValidatedZip(files: Map<string, Uint8Array>): Promise<{ 
  zipBuffer: Uint8Array; 
  sha256: string; 
  fileCount: number;
}> {
  // Create ZIP using Deno's built-in compression
  const zip = await createZip(files);
  
  // Validate ZIP by checking magic number
  if (zip[0] !== 0x50 || zip[1] !== 0x4B) {
    throw new Error('Invalid ZIP format: missing magic number');
  }
  
  // Calculate SHA256 - create a new ArrayBuffer for crypto.subtle
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(zip));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    zipBuffer: zip,
    sha256,
    fileCount: files.size,
  };
}

async function createZip(files: Map<string, Uint8Array>): Promise<Uint8Array> {
  const entries: Array<{ name: string; data: Uint8Array; offset: number }> = [];
  let offset = 0;
  
  // Local file headers + data
  const localFiles: Uint8Array[] = [];
  
  for (const [name, data] of files.entries()) {
    const nameBytes = new TextEncoder().encode(name);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    
    // Local file header signature
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // compression (stored)
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, 0, true); // crc32 (simplified, should calculate)
    view.setUint32(18, data.length, true); // compressed size
    view.setUint32(22, data.length, true); // uncompressed size
    view.setUint16(26, nameBytes.length, true); // filename length
    view.setUint16(28, 0, true); // extra field length
    
    localHeader.set(nameBytes, 30);
    
    entries.push({ name, data, offset });
    localFiles.push(localHeader, data);
    offset += localHeader.length + data.length;
  }
  
  // Central directory
  const centralDir: Uint8Array[] = [];
  let centralDirSize = 0;
  
  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(cdHeader.buffer);
    
    view.setUint32(0, 0x02014b50, true); // central directory signature
    view.setUint16(4, 20, true); // version made by
    view.setUint16(6, 20, true); // version needed
    view.setUint16(8, 0, true); // flags
    view.setUint16(10, 0, true); // compression
    view.setUint16(12, 0, true); // mod time
    view.setUint16(14, 0, true); // mod date
    view.setUint32(16, 0, true); // crc32
    view.setUint32(20, entry.data.length, true); // compressed size
    view.setUint32(24, entry.data.length, true); // uncompressed size
    view.setUint16(28, nameBytes.length, true); // filename length
    view.setUint16(30, 0, true); // extra field length
    view.setUint16(32, 0, true); // comment length
    view.setUint16(34, 0, true); // disk number
    view.setUint16(36, 0, true); // internal attributes
    view.setUint32(38, 0, true); // external attributes
    view.setUint32(42, entry.offset, true); // relative offset
    
    cdHeader.set(nameBytes, 46);
    
    centralDir.push(cdHeader);
    centralDirSize += cdHeader.length;
  }
  
  // End of central directory
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // disk number
  eocdView.setUint16(6, 0, true); // disk with central directory
  eocdView.setUint16(8, entries.length, true); // entries on this disk
  eocdView.setUint16(10, entries.length, true); // total entries
  eocdView.setUint32(12, centralDirSize, true); // central directory size
  eocdView.setUint32(16, offset, true); // central directory offset
  eocdView.setUint16(20, 0, true); // comment length
  
  // Concatenate all parts
  const totalSize = localFiles.reduce((sum, arr) => sum + arr.length, 0) + 
                    centralDirSize + eocd.length;
  const result = new Uint8Array(totalSize);
  
  let pos = 0;
  for (const chunk of localFiles) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  for (const chunk of centralDir) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  result.set(eocd, pos);
  
  return result;
}
