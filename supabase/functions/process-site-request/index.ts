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
  geometry?: Array<{ lat: number; lon: number }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId } = await req.json() as ProcessRequest;
    console.log('Processing request:', requestId);

    // Get request details
    const { data: request, error: fetchError } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Request not found');
    }

    // Start processing
    await updateProgress(supabase, requestId, 10, 'processing', 'Validating area...');

    // Validate AOI
    if (request.radius_meters > 2000) {
      throw new Error('Radius exceeds maximum of 2km');
    }

    await updateProgress(supabase, requestId, 20, 'processing', 'Fetching OSM data...');

    // Fetch OSM data
    const osmData = await fetchOSMData(request);

    await updateProgress(supabase, requestId, 50, 'processing', 'Fetching elevation data...');

    // Fetch elevation data
    const elevationData = await fetchElevationData(request);

    await updateProgress(supabase, requestId, 70, 'processing', 'Creating package...');

    // Create ZIP package
    const zipData = await createZipPackage(request, osmData, elevationData);

    await updateProgress(supabase, requestId, 85, 'processing', 'Uploading package...');

    // Upload to storage
    const fileName = `${requestId}_site_pack.zip`;
    const filePath = `${request.user_id || 'anonymous'}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('site-packs')
      .upload(filePath, zipData, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create signed URL (7 days)
    const { data: urlData } = await supabase.storage
      .from('site-packs')
      .createSignedUrl(filePath, 604800);

    await updateProgress(supabase, requestId, 100, 'completed', null, urlData?.signedUrl);

    return new Response(
      JSON.stringify({ success: true, downloadUrl: urlData?.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const { requestId } = await req.json().catch(() => ({})) as ProcessRequest;
    if (requestId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await updateProgress(supabase, requestId, 0, 'failed', errorMessage);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function updateProgress(
  supabase: any,
  requestId: string,
  progress: number,
  status: string,
  errorMessage: string | null = null,
  fileUrl: string | null = null
) {
  const updates: any = { progress, status };
  if (errorMessage !== null) updates.error_message = errorMessage;
  if (fileUrl !== null) updates.file_url = fileUrl;
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  await supabase
    .from('site_requests')
    .update(updates)
    .eq('id', requestId);
}

async function fetchOSMData(request: any) {
  const { center_lat, center_lng, radius_meters } = request;
  const radiusKm = radius_meters / 1000;
  
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  // Build query based on selected options
  const queries: string[] = [];
  
  if (request.include_buildings) {
    queries.push('way["building"](around:' + radiusKm * 1000 + ',' + center_lat + ',' + center_lng + ');');
  }
  if (request.include_roads) {
    queries.push('way["highway"](around:' + radiusKm * 1000 + ',' + center_lat + ',' + center_lng + ');');
  }
  if (request.include_landuse) {
    queries.push('way["landuse"](around:' + radiusKm * 1000 + ',' + center_lat + ',' + center_lng + ');');
  }

  const overpassQuery = `[out:json][timeout:60];(${queries.join('')});out body;>;out skel qt;`;
  
  console.log('Overpass query:', overpassQuery);

  const response = await fetch(overpassUrl, {
    method: 'POST',
    body: overpassQuery,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Convert to GeoJSON format by category
  const buildings: any[] = [];
  const roads: any[] = [];
  const landuse: any[] = [];
  
  // Create node lookup
  const nodes = new Map();
  data.elements.forEach((el: OSMElement) => {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    }
  });

  // Process ways
  data.elements.forEach((el: OSMElement) => {
    if (el.type === 'way' && el.nodes) {
      const coordinates = el.nodes
        .map(nodeId => nodes.get(nodeId))
        .filter(node => node)
        .map(node => [node.lon, node.lat]);

      if (coordinates.length < 2) return;

      const feature = {
        type: 'Feature',
        properties: el.tags || {},
        geometry: {
          type: coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
                coordinates[0][1] === coordinates[coordinates.length - 1][1]
            ? 'Polygon'
            : 'LineString',
          coordinates: coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
                      coordinates[0][1] === coordinates[coordinates.length - 1][1]
            ? [coordinates]
            : coordinates,
        },
      };

      if (el.tags?.building) buildings.push(feature);
      if (el.tags?.highway) roads.push(feature);
      if (el.tags?.landuse) landuse.push(feature);
    }
  });

  return { buildings, roads, landuse };
}

async function fetchElevationData(request: any) {
  const { center_lat, center_lng, radius_meters } = request;
  
  if (!request.include_terrain) {
    return null;
  }

  // Create a simple grid of points for elevation sampling
  const gridSize = 10;
  const points: Array<{ lat: number; lng: number }> = [];
  const radiusDeg = (radius_meters / 111000); // rough conversion to degrees

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const lat = center_lat + (radiusDeg * 2 * (i / gridSize - 0.5));
      const lng = center_lng + (radiusDeg * 2 * (j / gridSize - 0.5));
      points.push({ lat, lng });
    }
  }

  // Fetch elevation for each point (in batches to respect API limits)
  const elevations: any[] = [];
  const batchSize = 100;
  
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    const locations = batch.map(p => `${p.lat},${p.lng}`).join('|');
    
    const url = `https://api.opentopodata.org/v1/srtm90m?locations=${locations}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Elevation API error:', response.statusText);
      continue;
    }

    const data = await response.json();
    elevations.push(...data.results.map((r: any, idx: number) => ({
      type: 'Feature',
      properties: { elevation: r.elevation },
      geometry: {
        type: 'Point',
        coordinates: [batch[idx].lng, batch[idx].lat, r.elevation],
      },
    })));

    // Rate limiting - wait between batches
    if (i + batchSize < points.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return elevations;
}

async function createZipPackage(request: any, osmData: any, elevationData: any) {
  // Create README
  const readme = `# Site Pack - ${request.location_name}

Generated: ${new Date().toISOString()}
Location: ${request.center_lat}, ${request.center_lng}
Radius: ${request.radius_meters}m
Area: ${request.area_sqm.toFixed(2)} m²

## Data Sources
- OpenStreetMap (ODbL): https://www.openstreetmap.org/copyright
- SRTM Elevation Data: https://www2.jpl.nasa.gov/srtm/

## Coordinate System
All GeoJSON files use EPSG:4326 (WGS84)

## Files Included
${request.include_buildings ? '- buildings.geojson: Building footprints\n' : ''}${request.include_roads ? '- roads.geojson: Road network\n' : ''}${request.include_landuse ? '- landuse.geojson: Land use polygons\n' : ''}${request.include_terrain ? '- terrain.geojson: Elevation points\n' : ''}- aoi.geojson: Area of interest boundary
- metadata.json: Request parameters and metadata
`;

  // Create metadata
  const metadata = {
    id: request.id,
    location: request.location_name,
    center: [request.center_lng, request.center_lat],
    radius_meters: request.radius_meters,
    area_sqm: request.area_sqm,
    generated_at: new Date().toISOString(),
    layers: {
      buildings: request.include_buildings,
      roads: request.include_roads,
      landuse: request.include_landuse,
      terrain: request.include_terrain,
    },
  };

  // Create file entries
  const files = new Map<string, string>();
  files.set('README.md', readme);
  files.set('metadata.json', JSON.stringify(metadata, null, 2));
  
  // Add GeoJSON files
  if (request.include_buildings && osmData.buildings.length > 0) {
    files.set('buildings.geojson', JSON.stringify({
      type: 'FeatureCollection',
      features: osmData.buildings,
    }, null, 2));
  }
  
  if (request.include_roads && osmData.roads.length > 0) {
    files.set('roads.geojson', JSON.stringify({
      type: 'FeatureCollection',
      features: osmData.roads,
    }, null, 2));
  }
  
  if (request.include_landuse && osmData.landuse.length > 0) {
    files.set('landuse.geojson', JSON.stringify({
      type: 'FeatureCollection',
      features: osmData.landuse,
    }, null, 2));
  }
  
  if (request.include_terrain && elevationData && elevationData.length > 0) {
    files.set('terrain.geojson', JSON.stringify({
      type: 'FeatureCollection',
      features: elevationData,
    }, null, 2));
  }

  files.set('aoi.geojson', JSON.stringify(request.boundary_geojson, null, 2));

  // Create ZIP using native Deno compression
  const zip = await createZip(files);
  return zip;
}

async function createZip(files: Map<string, string>): Promise<Uint8Array> {
  // Simple ZIP file creation
  // For production, consider using a proper ZIP library
  // This is a basic implementation for demonstration
  
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  
  // ZIP local file header structure
  for (const [filename, content] of files) {
    const filenameBytes = encoder.encode(filename);
    const contentBytes = encoder.encode(content);
    
    // Local file header
    const header = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(header.buffer);
    
    // Signature
    view.setUint32(0, 0x04034b50, true);
    // Version
    view.setUint16(4, 20, true);
    // Flags
    view.setUint16(6, 0, true);
    // Compression (0 = no compression)
    view.setUint16(8, 0, true);
    // Mod time/date
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    // CRC32 (simplified)
    view.setUint32(14, 0, true);
    // Compressed size
    view.setUint32(18, contentBytes.length, true);
    // Uncompressed size
    view.setUint32(22, contentBytes.length, true);
    // Filename length
    view.setUint16(26, filenameBytes.length, true);
    // Extra field length
    view.setUint16(28, 0, true);
    
    // Filename
    header.set(filenameBytes, 30);
    
    chunks.push(header);
    chunks.push(contentBytes);
  }
  
  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}
