/**
 * Generate 3D Site Context Model
 * Professional-grade 3D model generation from real-world geospatial data
 * Output: DXF format compatible with AutoCAD, Rhino, SketchUp
 * Data Sources: OpenStreetMap (buildings, roads) + SRTM elevation data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { DXFBuilder } from '../_shared/dxfExport.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

interface OSMBuilding {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: {
    building?: string;
    'building:levels'?: string;
    height?: string;
    name?: string;
  };
}

interface OSMWay {
  type: string;
  id: number;
  nodes: number[];
  tags?: {
    highway?: string;
    waterway?: string;
    natural?: string;
    name?: string;
  };
}

interface OSMNode {
  type: string;
  id: number;
  lat: number;
  lon: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏗️ Starting 3D Site Model Generation');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { siteId, bbox } = await req.json() as {
      siteId: string;
      bbox?: BoundingBox;
    };

    if (!siteId) {
      throw new Error('Missing siteId parameter');
    }

    // Fetch site data
    console.log('📍 Fetching site data:', siteId);
    const { data: site, error: siteError } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      throw new Error(`Failed to fetch site: ${siteError?.message}`);
    }

    // Calculate bounding box
    const boundingBox: BoundingBox = bbox || calculateBBox(
      site.center_lat,
      site.center_lng,
      site.radius_meters || 500
    );

    console.log('📦 Bounding box:', boundingBox);

    // Fetch OSM data
    console.log('🗺️ Fetching OSM data...');
    const osmData = await fetchOSMData(boundingBox);

    // Fetch elevation data
    console.log('⛰️ Fetching elevation data...');
    const elevationData = await fetchElevationData(boundingBox, supabase);

    // Generate DXF model
    console.log('🎨 Generating 3D model...');
    const dxfContent = generateDXFModel(
      osmData,
      elevationData,
      boundingBox,
      site.location_name
    );

    console.log('✅ 3D model generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        dxfContent,
        metadata: {
          siteName: site.location_name,
          bounds: boundingBox,
          buildingCount: osmData.buildings.length,
          roadCount: osmData.roads.length,
          waterBodyCount: osmData.waterBodies.length,
          elevationPoints: elevationData.points.length,
          generatedAt: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error generating 3D model:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Calculate bounding box from center point and radius
 */
function calculateBBox(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): BoundingBox {
  const latOffset = radiusMeters / 111320; // 1 degree lat ≈ 111.32 km
  const lngOffset = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

  return {
    minLat: centerLat - latOffset,
    maxLat: centerLat + latOffset,
    minLng: centerLng - lngOffset,
    maxLng: centerLng + lngOffset,
  };
}

/**
 * Fetch OpenStreetMap data for the area
 */
async function fetchOSMData(bbox: BoundingBox) {
  const overpassQuery = `
    [out:json][timeout:25];
    (
      way["building"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
      relation["building"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
      way["highway"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
      way["waterway"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
      way["natural"="water"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
    );
    out body;
    >;
    out skel qt;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: overpassQuery,
    headers: { 'Content-Type': 'text/plain' },
  });

  if (!response.ok) {
    throw new Error(`OSM API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Parse elements into structured data
  const nodes = new Map<number, OSMNode>();
  const buildings: OSMBuilding[] = [];
  const roads: OSMWay[] = [];
  const waterBodies: OSMWay[] = [];

  for (const element of data.elements) {
    if (element.type === 'node') {
      nodes.set(element.id, element);
    } else if (element.type === 'way' || element.type === 'relation') {
      if (element.tags?.building) {
        buildings.push(element);
      } else if (element.tags?.highway) {
        roads.push(element);
      } else if (element.tags?.waterway || element.tags?.natural === 'water') {
        waterBodies.push(element);
      }
    }
  }

  console.log(`📊 OSM Data: ${buildings.length} buildings, ${roads.length} roads, ${waterBodies.length} water bodies`);

  return { buildings, roads, waterBodies, nodes };
}

/**
 * Fetch elevation data from SRTM via Open-Elevation API
 */
async function fetchElevationData(bbox: BoundingBox, supabase: any) {
  // Create a grid of points for elevation sampling
  const gridSize = 20; // 20x20 grid
  const points: Array<{ lat: number; lng: number; elevation: number }> = [];

  const latStep = (bbox.maxLat - bbox.minLat) / gridSize;
  const lngStep = (bbox.maxLng - bbox.minLng) / gridSize;

  const locations = [];
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const lat = bbox.minLat + i * latStep;
      const lng = bbox.minLng + j * lngStep;
      locations.push({ latitude: lat, longitude: lng });
    }
  }

  try {
    // Use Open-Elevation API (free, no API key needed)
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });

    if (response.ok) {
      const data = await response.json();
      data.results.forEach((result: any) => {
        points.push({
          lat: result.latitude,
          lng: result.longitude,
          elevation: result.elevation,
        });
      });
    } else {
      console.warn('⚠️ Open-Elevation API failed, using fallback');
    }
  } catch (error) {
    console.warn('⚠️ Elevation fetch failed:', error);
  }

  // If no elevation data, use flat terrain
  if (points.length === 0) {
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const lat = bbox.minLat + i * latStep;
        const lng = bbox.minLng + j * lngStep;
        points.push({ lat, lng, elevation: 0 });
      }
    }
  }

  console.log(`📊 Elevation: ${points.length} sample points`);

  return { points, gridSize };
}

/**
 * Generate DXF 3D model from collected data
 */
function generateDXFModel(
  osmData: any,
  elevationData: any,
  bbox: BoundingBox,
  siteName: string
): string {
  const dxf = new DXFBuilder({ units: 'meters', precision: 6 });

  // Add layers
  dxf.addLayer({ name: 'BUILDINGS', color: 1 }); // Red
  dxf.addLayer({ name: 'ROADS', color: 3 }); // Green
  dxf.addLayer({ name: 'WATER', color: 5 }); // Blue
  dxf.addLayer({ name: 'TOPOGRAPHY', color: 8 }); // Gray
  dxf.addLayer({ name: 'BOUNDARY', color: 7 }); // White
  dxf.addLayer({ name: 'TEXT', color: 7 }); // White

  // Add metadata
  dxf.setMetadata('SITE_NAME', siteName);
  dxf.setMetadata('GENERATED_BY', 'SiteIQ_3D_Model_Generator');
  dxf.setMetadata('DATE', new Date().toISOString());
  dxf.setMetadata('BBOX', `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`);

  // Convert coordinates to local projection (center at origin)
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLng = (bbox.minLng + bbox.maxLng) / 2;

  const toLocal = (lat: number, lng: number): [number, number] => {
    const x = (lng - centerLng) * 111320 * Math.cos((centerLat * Math.PI) / 180);
    const y = (lat - centerLat) * 111320;
    return [x, y];
  };

  // Add buildings
  for (const building of osmData.buildings) {
    if (!building.nodes || building.nodes.length < 3) continue;

    const coords: number[][] = [];
    for (const nodeId of building.nodes) {
      const node = osmData.nodes.get(nodeId);
      if (node) {
        const [x, y] = toLocal(node.lat, node.lon);
        coords.push([x, y]);
      }
    }

    if (coords.length >= 3) {
      // Estimate building height
      let height = 10; // Default 10m
      if (building.tags?.height) {
        height = parseFloat(building.tags.height);
      } else if (building.tags?.['building:levels']) {
        height = parseFloat(building.tags['building:levels']) * 3; // 3m per floor
      }

      dxf.addBuilding(coords, height, 'BUILDINGS');
    }
  }

  // Add roads
  for (const road of osmData.roads) {
    if (!road.nodes || road.nodes.length < 2) continue;

    const coords: number[][] = [];
    for (const nodeId of road.nodes) {
      const node = osmData.nodes.get(nodeId);
      if (node) {
        const [x, y] = toLocal(node.lat, node.lon);
        coords.push([x, y]);
      }
    }

    if (coords.length >= 2) {
      dxf.addRoad(coords, 'ROADS');
    }
  }

  // Add water bodies
  for (const water of osmData.waterBodies) {
    if (!water.nodes || water.nodes.length < 2) continue;

    const coords: number[][] = [];
    for (const nodeId of water.nodes) {
      const node = osmData.nodes.get(nodeId);
      if (node) {
        const [x, y] = toLocal(node.lat, node.lon);
        coords.push([x, y]);
      }
    }

    if (coords.length >= 2) {
      dxf.addRoad(coords, 'WATER'); // Use road method for polylines
    }
  }

  // Add topography as contour lines
  const { points, gridSize } = elevationData;
  const elevations = new Set(points.map((p: any) => Math.round(p.elevation / 5) * 5)); // 5m intervals

  for (const elevationValue of Array.from(elevations)) {
    const elevation = elevationValue as number;
    const contourPoints: Array<{ x: number; y: number }> = [];
    
    // Simple contour generation: collect points at this elevation
    for (const point of points) {
      if (Math.abs(point.elevation - elevation) < 2.5) {
        const [x, y] = toLocal(point.lat, point.lng);
        contourPoints.push({ x, y });
      }
    }

    if (contourPoints.length > 2) {
      dxf.addContourLine(contourPoints, elevation, 'TOPOGRAPHY');
    }
  }

  // Add boundary box
  const corners = [
    toLocal(bbox.minLat, bbox.minLng),
    toLocal(bbox.minLat, bbox.maxLng),
    toLocal(bbox.maxLat, bbox.maxLng),
    toLocal(bbox.maxLat, bbox.minLng),
    toLocal(bbox.minLat, bbox.minLng),
  ];
  dxf.addRoad(corners, 'BOUNDARY');

  // Add site name text
  dxf.addText(siteName, 0, 0, 5, 'TEXT');

  return dxf.build();
}
