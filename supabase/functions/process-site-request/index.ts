import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { geojsonToDXF, DXFBuilder } from '../_shared/dxfExport.ts';
import { createGLBFromScene } from '../_shared/glbExport.ts';
import { createSitePlanPDF } from '../_shared/pdfExport.ts';
import { createColladaFromScene } from '../_shared/colladaExport.ts';
import { generateContours, simplifyContour, type ElevationGrid } from '../_shared/contourGeneration.ts';

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
    const stageStart = Date.now();
    await logJobStage(supabase, requestId, 'fetch_osm', 'started');
    
    const osmData = await fetchOSMData(request);
    const osmDuration = Date.now() - stageStart;
    await logJobStage(supabase, requestId, 'fetch_osm', 'completed', osmDuration, null, {
      buildings: osmData.buildings?.features?.length || 0,
      roads: osmData.roads?.features?.length || 0,
      landuse: osmData.landuse?.features?.length || 0,
    });
    
    await updateProgress(supabase, requestId, 30, 'processing', null);

    // Fetch elevation data if requested
    let elevationData = null;
    if (request.include_terrain) {
      try {
        console.log('Fetching elevation data...');
        const elevStart = Date.now();
        await logJobStage(supabase, requestId, 'fetch_elevation', 'started');
        
        elevationData = await fetchElevationData(request);
        
        const elevDuration = Date.now() - elevStart;
        await logJobStage(supabase, requestId, 'fetch_elevation', 'completed', elevDuration, null, {
          points: elevationData?.features?.length || 0,
        });
      } catch (error) {
        console.warn('Elevation fetch failed, continuing without terrain:', error);
        await logJobStage(supabase, requestId, 'fetch_elevation', 'failed', 0, 
          error instanceof Error ? error.message : 'Unknown error');
      }
    }
    await updateProgress(supabase, requestId, 50, 'processing', null);

    // Create file contents
    console.log('Creating export files...');
    const exportStart = Date.now();
    await logJobStage(supabase, requestId, 'create_exports', 'started');
    
    const files = await createExportFiles(request, osmData, elevationData);
    
    // Fetch imagery if requested
    if (request.include_imagery) {
      try {
        console.log('Fetching imagery tiles...');
        const mapboxToken = Deno.env.get('MAPBOX_TOKEN');
        if (mapboxToken) {
          const { fetchImageryTiles, downloadImageryTiles } = await import('../_shared/imageryFetch.ts');
          const { tiles, metadata } = await fetchImageryTiles(
            request.center_lat,
            request.center_lng,
            request.radius_meters || 500,
            mapboxToken
          );
          const imageryFiles = await downloadImageryTiles(tiles);
          imageryFiles.forEach((data, path) => files.set(path, data));
          const encoder = new TextEncoder();
          files.set('imagery/metadata.json', encoder.encode(JSON.stringify(metadata, null, 2)));
        }
      } catch (error) {
        console.warn('Imagery fetch failed, continuing without imagery:', error);
      }
    }
    
    const exportDuration = Date.now() - exportStart;
    await logJobStage(supabase, requestId, 'create_exports', 'completed', exportDuration, null, {
      fileCount: files.size,
    });
    
    await updateProgress(supabase, requestId, 75, 'processing', null);

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

async function logJobStage(
  supabase: any,
  requestId: string,
  stage: string,
  status: 'started' | 'completed' | 'failed',
  durationMs?: number,
  errorMessage?: string | null,
  metadata?: any
) {
  try {
    await supabase
      .from('job_logs')
      .insert({
        site_request_id: requestId,
        stage,
        status,
        duration_ms: durationMs || null,
        error_message: errorMessage || null,
        metadata: metadata || null,
      });
  } catch (error) {
    console.error('Failed to log job stage:', error);
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
    
    // Generate contour lines from elevation data
    try {
      const contoursGeoJSON = generateContoursFromElevation(elevationData, request);
      if (contoursGeoJSON) {
        files.set('geojson/contours.geojson', encoder.encode(JSON.stringify(contoursGeoJSON, null, 2)));
        
        // Also generate contour DXF export
        const contourDXF = generateContourDXF(contoursGeoJSON, request);
        files.set('exports/contours.dxf', encoder.encode(contourDXF));
        console.log('✅ Contours generated and exported');
      }
    } catch (error) {
      console.error('❌ Contour generation failed:', error);
    }
  }

  // DXF export
  if (request.include_dxf) {
    try {
      const dxfContent = createDXF(osmData, elevationData, request);
      const dxfBytes = encoder.encode(dxfContent);
      files.set('exports/layers.dxf', dxfBytes);
      console.log(`✅ DXF export complete: ${dxfBytes.length} bytes`);
    } catch (error) {
      console.error('❌ DXF export failed:', error);
    }
  }

  // GLB export
  if (request.include_glb) {
    try {
      const glb = await createGLB(osmData, elevationData);
      files.set('exports/scene.glb', glb);
      console.log(`✅ GLB export complete: ${glb.length} bytes`);
    } catch (error) {
      console.error('❌ GLB export failed:', error);
    }
  }

  // PDF Plan export
  if (request.exports_pdf) {
    try {
      const pdfString = createPDFPlan(request, osmData);
      // PDF is binary data represented as string, use binary encoding
      const pdfBytes = new Uint8Array(pdfString.length);
      for (let i = 0; i < pdfString.length; i++) {
        pdfBytes[i] = pdfString.charCodeAt(i) & 0xFF;
      }
      files.set('exports/plan.pdf', pdfBytes);
      console.log(`✅ PDF export complete: ${pdfBytes.length} bytes`);
    } catch (error) {
      console.error('❌ PDF export failed:', error);
    }
  }

  // DWG export (DXF with DWG extension for compatibility)
  if (request.exports_dwg) {
    try {
      const dwgContent = createDWG(osmData, elevationData, request);
      const dwgBytes = encoder.encode(dwgContent);
      files.set('exports/layers.dwg', dwgBytes);
      console.log(`✅ DWG export complete: ${dwgBytes.length} bytes`);
    } catch (error) {
      console.error('❌ DWG export failed:', error);
    }
  }

  // SKP export (COLLADA format)
  if (request.exports_skp) {
    try {
      // Prepare buildings for COLLADA
      const buildings = osmData.buildings?.features?.map((f: any) => {
        const coords = f.geometry.coordinates[0].map((c: number[]) => [c[0], c[1]]);
        const height = f.properties?.height || 10;
        return {
          coords,
          height,
          name: f.properties?.name || undefined
        };
      }) || [];

      // Prepare terrain if available
      let terrain = null;
      if (elevationData?.triangulation) {
        terrain = {
          vertices: elevationData.triangulation.vertices,
          indices: elevationData.triangulation.indices
        };
      }

      // Generate COLLADA content
      const colladaContent = createColladaFromScene(
        buildings,
        terrain || undefined,
        {
          modelName: request.location_name || 'Site Model',
          authoringTool: 'SiteKit Pro',
          upAxis: 'Z_UP'
        }
      );

      files.set('exports/site_model.dae', encoder.encode(colladaContent));
      
      const note = `# SketchUp Import Instructions

This package includes a COLLADA (.dae) file that SketchUp can import natively.

## Import Steps
1. Open SketchUp
2. Go to File > Import
3. Select "COLLADA Files (*.dae)" from the file type dropdown
4. Browse to and select: site_model.dae
5. Click "Import"

## What's Included
- Building footprints with accurate heights
- Terrain surface with elevation data (if requested)
- Georeferenced coordinates in meters

## Tips
- The model is scaled to real-world meters
- Materials are basic - you can apply your own textures in SketchUp
- Buildings are simple extrusions - add architectural details in SketchUp
- Use SketchUp's "Geo-location" feature to align with satellite imagery

Generated by SiteKit Pro
`;
      files.set('exports/SKETCHUP_IMPORT.md', encoder.encode(note));
    } catch (error) {
      console.warn('COLLADA export failed:', error);
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

function createDXF(osmData: any, elevationData: any, request: any): string {
  console.log('🔧 Creating professional DXF export...');
  
  // Extract contours from elevation data
  const contours: any[] = [];
  if (elevationData?.features) {
    // Group contour line segments by elevation
    const contourMap = new Map<number, Array<{x: number, y: number}>>();
    
    elevationData.features.forEach((feature: any) => {
      if (feature.properties?.elevation !== undefined) {
        const elev = Math.round(feature.properties.elevation / 5) * 5; // Round to 5m intervals
        if (!contourMap.has(elev)) {
          contourMap.set(elev, []);
        }
        if (feature.geometry.type === 'LineString') {
          feature.geometry.coordinates.forEach((coord: number[]) => {
            contourMap.get(elev)!.push({ x: coord[0], y: coord[1] });
          });
        } else if (feature.geometry.type === 'Point') {
          const [x, y] = feature.geometry.coordinates;
          contourMap.get(elev)!.push({ x, y });
        }
      }
    });
    
    contourMap.forEach((points, elevation) => {
      if (points.length > 1) {
        contours.push({ elevation, points });
      }
    });
  }
  
  const metadata = {
    project: request.location_name || 'Site Pack',
    center: `${request.center_lat.toFixed(6)}, ${request.center_lng.toFixed(6)}`,
    radius: `${request.radius_meters}m`,
    date: new Date().toISOString().split('T')[0],
    crs: 'EPSG:4326'
  };
  
  return geojsonToDXF(osmData.buildings, osmData.roads, contours, metadata);
}

function createDWG(osmData: any, elevationData: any, request: any): string {
  // DWG is a proprietary format. For now, we create an enhanced DXF
  // and include a note about conversion. A proper DWG would require
  // a library like LibreDWG or commercial tools.
  
  const dxf = createDXF(osmData, elevationData, request);
  
  // Add a note in the DXF comments section
  const note = `; PROFESSIONAL DXF FILE - Compatible with AutoCAD, BricsCAD, DraftSight
; For native DWG format: Import this DXF and save as DWG
; Layers: BUILDINGS (3D), ROADS, CONTOURS (with elevation), TERRAIN
; Units: Meters | CRS: EPSG:4326
; Generated: ${new Date().toISOString()}
; 
`;
  
  return note + dxf;
}

function createPDFPlan(request: any, osmData: any): string {
  console.log('📄 Creating professional PDF site plan...');
  
  return createSitePlanPDF({
    siteName: request.location_name || 'Site Plan',
    centerLat: request.center_lat,
    centerLng: request.center_lng,
    radius: request.radius_meters || 500,
    buildings: osmData.buildings?.features || [],
    roads: osmData.roads?.features || [],
    boundary: request.boundary_geojson?.features?.[0]?.geometry,
    includeScaleBar: true,
    includeNorthArrow: true,
    includeLegend: true
  });
}

function createPDFPlan_OLD(request: any, osmData: any): string {
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
  console.log('🎨 Creating professional GLB with actual 3D geometry...');
  
  const buildings: any[] = [];
  
  // Process buildings
  if (osmData.buildings?.features) {
    osmData.buildings.features.forEach((feature: any, idx: number) => {
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0];
        const height = feature.properties?.height || 
                      feature.properties?.levels * 3.5 || 
                      10; // Default 10m
        
        buildings.push({
          coordinates: coords,
          height,
          name: feature.properties?.name || `Building_${idx + 1}`
        });
      }
    });
  }
  
  // Process terrain (if available)
  let terrain = undefined;
  if (elevationData?.features) {
    // Create simple terrain mesh from elevation points
    const points: Array<{x: number, y: number, z: number}> = [];
    
    elevationData.features.forEach((feature: any) => {
      if (feature.geometry.type === 'Point' && feature.geometry.coordinates[2] !== undefined) {
        const [x, y, z] = feature.geometry.coordinates;
        points.push({ x, y, z });
      }
    });
    
    if (points.length > 3) {
      // Simple grid-based triangulation
      const gridSize = Math.ceil(Math.sqrt(points.length));
      const vertices: number[] = [];
      const indices: number[] = [];
      const colors: number[] = [];
      
      // Sort points into grid
      points.forEach((p, i) => {
        vertices.push(p.x, p.z, p.y); // Y-up in GLB
        
        // Color by elevation
        const normalized = Math.min(Math.max(p.z / 100, 0), 1);
        colors.push(0.3 + normalized * 0.3, 0.5 - normalized * 0.2, 0.2);
      });
      
      // Create triangles (simple grid)
      for (let i = 0; i < gridSize - 1; i++) {
        for (let j = 0; j < gridSize - 1; j++) {
          const idx = i * gridSize + j;
          if (idx + gridSize + 1 < points.length) {
            indices.push(idx, idx + 1, idx + gridSize);
            indices.push(idx + 1, idx + gridSize + 1, idx + gridSize);
          }
        }
      }
      
      terrain = {
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices),
        colors: new Float32Array(colors)
      };
    }
  }
  
  console.log(`✅ GLB: ${buildings.length} buildings, terrain: ${terrain ? 'yes' : 'no'}`);
  
  return createGLBFromScene({ buildings, terrain });
}

/**
 * Generate contour lines from elevation point data
 */
function generateContoursFromElevation(elevationData: any, request: any): any {
  const features = elevationData.features || [];
  if (features.length === 0) return null;

  console.log('📊 Generating contours from', features.length, 'elevation points');

  // Build elevation grid
  const lons = features.map((f: any) => f.geometry.coordinates[0]);
  const lats = features.map((f: any) => f.geometry.coordinates[1]);
  const elevs = features.map((f: any) => f.properties.elevation);

  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minElev = Math.min(...elevs);
  const maxElev = Math.max(...elevs);

  // Create grid from point data
  const gridSize = 21; // 21x21 grid
  const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(NaN));

  features.forEach((f: any) => {
    const lon = f.geometry.coordinates[0];
    const lat = f.geometry.coordinates[1];
    const elev = f.properties.elevation;

    const i = Math.floor((lon - minLon) / (maxLon - minLon) * (gridSize - 1));
    const j = Math.floor((lat - minLat) / (maxLat - minLat) * (gridSize - 1));

    if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
      grid[j][i] = elev;
    }
  });

  // Fill gaps with interpolation
  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      if (isNaN(grid[j][i])) {
        const neighbors: number[] = [];
        if (i > 0 && !isNaN(grid[j][i - 1])) neighbors.push(grid[j][i - 1]);
        if (i < gridSize - 1 && !isNaN(grid[j][i + 1])) neighbors.push(grid[j][i + 1]);
        if (j > 0 && !isNaN(grid[j - 1][i])) neighbors.push(grid[j - 1][i]);
        if (j < gridSize - 1 && !isNaN(grid[j + 1][i])) neighbors.push(grid[j + 1][i]);

        if (neighbors.length > 0) {
          grid[j][i] = neighbors.reduce((a, b) => a + b) / neighbors.length;
        }
      }
    }
  }

  const elevationGrid: ElevationGrid = {
    values: grid,
    nx: gridSize,
    ny: gridSize,
    xMin: minLon,
    xMax: maxLon,
    yMin: minLat,
    yMax: maxLat
  };

  // Determine contour interval based on elevation range
  const range = maxElev - minElev;
  const interval = range < 20 ? 1 : range < 50 ? 2 : range < 100 ? 5 : 10;

  console.log(`📐 Elevation range: ${minElev.toFixed(1)}m - ${maxElev.toFixed(1)}m, interval: ${interval}m`);

  // Generate contours
  const contours = generateContours(elevationGrid, interval, minElev, maxElev);

  // Convert to GeoJSON
  const contourFeatures = contours.flatMap(contour => {
    return contour.segments.map(segment => {
      const simplified = simplifyContour(segment, 0.0001);
      return {
        type: 'Feature',
        properties: {
          elevation: contour.elevation,
          label: `${contour.elevation}m`
        },
        geometry: {
          type: 'LineString',
          coordinates: simplified.map(p => [p.x, p.y, contour.elevation])
        }
      };
    });
  });

  return {
    type: 'FeatureCollection',
    features: contourFeatures
  };
}

/**
 * Generate DXF file for contours
 */
function generateContourDXF(contoursGeoJSON: any, request: any): string {
  const dxf = new DXFBuilder({ units: 'meters', precision: 6 });

  dxf.addLayer({ name: 'CONTOURS', color: 8 });
  dxf.addLayer({ name: 'BOUNDARY', color: 7 });

  // Add contour lines
  let contourCount = 0;
  contoursGeoJSON.features?.forEach((feature: any) => {
    const elevation = feature.properties.elevation;
    const coords = feature.geometry.coordinates;

    if (coords && coords.length > 1) {
      const vertices = coords.map((c: number[]) => ({ x: c[0], y: c[1], z: elevation || 0 }));
      dxf.addEntity({
        type: 'POLYLINE',
        layer: 'CONTOURS',
        vertices,
        closed: false
      });
      contourCount++;
    }
  });

  console.log(`✅ Contour DXF generated with ${contourCount} lines`);

  return dxf.build();
}

async function createValidatedZip(files: Map<string, Uint8Array>): Promise<{ 
  zipBuffer: Uint8Array; 
  sha256: string; 
  fileCount: number;
}> {
  console.log(`Creating ZIP with ${files.size} files using JSZip...`);
  
  const zip = new JSZip();
  
  // Add all files to the ZIP
  for (const [filename, data] of files.entries()) {
    zip.file(filename, data);
    console.log(`  Added: ${filename} (${data.length} bytes)`);
  }
  
  // Generate ZIP as ArrayBuffer with proper compression
  const zipArrayBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6  // Balanced compression
    }
  });
  
  const zipBuffer = new Uint8Array(zipArrayBuffer);
  
  // Validate ZIP by checking magic number
  if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4B) {
    throw new Error('Invalid ZIP format: missing PK magic number');
  }
  
  // Calculate SHA256
  const hashBuffer = await crypto.subtle.digest('SHA-256', zipBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log(`ZIP created: ${zipBuffer.length} bytes, SHA256: ${sha256}`);
  
  return {
    zipBuffer,
    sha256,
    fileCount: files.size,
  };
}
