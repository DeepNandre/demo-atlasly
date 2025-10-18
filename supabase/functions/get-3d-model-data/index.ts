import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface Building {
  footprint: number[][];
  height: number;
  name?: string;
}

interface Road {
  points: number[][];
  type: string;
}

interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { siteId, bbox: providedBbox } = await req.json();

    if (!siteId) {
      throw new Error('siteId is required');
    }

    // Fetch site data
    const { data: siteData, error: siteError } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteError || !siteData) {
      throw new Error('Site not found');
    }

    // Calculate bounding box
    const bbox: BoundingBox = providedBbox || calculateBBox(
      siteData.center_lat,
      siteData.center_lng,
      siteData.radius_meters || 500
    );

    console.log('Fetching 3D data for bbox:', bbox);

    // Fetch data in parallel
    const [osmData, elevationData] = await Promise.all([
      fetchOSMData(bbox),
      fetchElevationData(bbox)
    ]);

    // Process and return structured 3D data with safe defaults
    const modelData = {
      buildings: (osmData.buildings || []).map((b: any) => ({
        footprint: b.coordinates || [],
        height: b.height || 10,
        name: b.name
      })),
      roads: (osmData.roads || []).map((r: any) => ({
        points: r.coordinates || [],
        type: r.type || 'unknown'
      })),
      water: (osmData.water || []).map((w: any) => ({
        points: w.coordinates || []
      })),
      terrain: Array.isArray(elevationData) ? elevationData : [],
      bounds: bbox,
      center: {
        lat: siteData.center_lat,
        lng: siteData.center_lng
      }
    };

    return new Response(
      JSON.stringify(modelData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-3d-model-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function calculateBBox(centerLat: number, centerLng: number, radiusMeters: number): BoundingBox {
  const latDegrees = radiusMeters / 111320;
  const lngDegrees = radiusMeters / (111320 * Math.cos(centerLat * Math.PI / 180));
  
  return {
    minLat: centerLat - latDegrees,
    maxLat: centerLat + latDegrees,
    minLng: centerLng - lngDegrees,
    maxLng: centerLng + lngDegrees
  };
}

async function fetchOSMData(bbox: BoundingBox) {
  const query = `
    [out:json][timeout:60];
    (
      way["building"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
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
    body: query
  });

  if (!response.ok) {
    throw new Error('Failed to fetch OSM data');
  }

  const data = await response.json();
  const nodes = new Map();
  const buildings: Building[] = [];
  const roads: Road[] = [];
  const water: any[] = [];

  // Build node lookup
  data.elements.forEach((el: any) => {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  });

  // Process ways
  data.elements.forEach((el: any) => {
    if (el.type === 'way') {
      const coords = el.nodes
        .map((nodeId: number) => nodes.get(nodeId))
        .filter(Boolean)
        .map((node: any) => [node.lng, node.lat]);

      if (coords.length === 0) return;

      if (el.tags?.building) {
        const height = el.tags['building:levels'] 
          ? parseFloat(el.tags['building:levels']) * 3
          : el.tags.height 
          ? parseFloat(el.tags.height)
          : 10;

        buildings.push({
          footprint: coords,
          height,
          name: el.tags.name
        });
      } else if (el.tags?.highway) {
        roads.push({
          points: coords,
          type: el.tags.highway
        });
      } else if (el.tags?.waterway || el.tags?.natural === 'water') {
        water.push({ coordinates: coords });
      }
    }
  });

  return { buildings, roads, water };
}

async function fetchElevationData(bbox: BoundingBox) {
  const gridSize = 20;
  const latStep = (bbox.maxLat - bbox.minLat) / gridSize;
  const lngStep = (bbox.maxLng - bbox.minLng) / gridSize;
  
  const locations = [];
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      locations.push({
        latitude: bbox.minLat + i * latStep,
        longitude: bbox.minLng + j * lngStep
      });
    }
  }

  try {
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations })
    });

    if (!response.ok) {
      console.warn('Elevation API failed, using flat terrain');
      return locations.map(loc => ({ ...loc, elevation: 0 }));
    }

    const data = await response.json();
    return data.results.map((r: any) => ({
      lat: r.latitude,
      lng: r.longitude,
      elevation: r.elevation
    }));
  } catch (error) {
    console.warn('Elevation fetch error:', error);
    return locations.map(loc => ({ ...loc, elevation: 0 }));
  }
}
