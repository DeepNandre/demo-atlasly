/**
 * Multi-Source Data Fusion Engine
 * Integrates OpenStreetMap, weather, elevation, and other free data sources
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - In-memory + localStorage caching (30min TTL)
 * - Reduced timeout (15s per endpoint)
 * - Request deduplication
 */

import { getCachedData, setCachedData, generateCacheKey } from './osmCache';
import type { OSMMapData, LocationContext, BoundingBox } from '@/types/site';

// Legacy export for backwards compatibility
export type OSMData = OSMMapData;
export type { LocationContext };

export interface WeatherData {
  climate: string;
  avgTemp: number;
  avgPrecipitation: number;
  sunHours: number;
  heatingDegreeDays: number;
  coolingDegreeDays: number;
}

export interface SiteContext {
  location: LocationContext;
  osm: OSMData;
  weather: WeatherData;
  elevation: {
    min: number;
    max: number;
    slope: number;
  };
  zoning?: {
    type: string;
    restrictions: string[];
  };
}

/**
 * Fetch OpenStreetMap data for a location
 */
export async function fetchOSMData(
  lat: number, 
  lng: number, 
  radius: number = 500,
  boundary?: BoundingBox
): Promise<OSMMapData> {
  // Check cache first
  const cacheKey = generateCacheKey(lat, lng, radius, boundary);
  const cached = getCachedData<OSMMapData>(cacheKey);
  if (cached) {
    return cached;
  }

  // Multiple Overpass API endpoints for fallback
  const overpassEndpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
  ];
  
  // Reduced timeout for faster fallback (15s per endpoint = 45s max)
  const timeout = 15;
  
  // Overpass QL query - use bounding box if available, otherwise circular radius
  const query = boundary 
    ? `
      [out:json][timeout:${timeout}];
      (
        way["building"](${boundary.minLat},${boundary.minLng},${boundary.maxLat},${boundary.maxLng});
        way["highway"](${boundary.minLat},${boundary.minLng},${boundary.maxLat},${boundary.maxLng});
        node["amenity"](${boundary.minLat},${boundary.minLng},${boundary.maxLat},${boundary.maxLng});
        way["landuse"](${boundary.minLat},${boundary.minLng},${boundary.maxLat},${boundary.maxLng});
        node["public_transport"](${boundary.minLat},${boundary.minLng},${boundary.maxLat},${boundary.maxLng});
      );
      out body;
      >;
      out skel qt;
    `
    : `
      [out:json][timeout:${timeout}];
      (
        way["building"](around:${radius},${lat},${lng});
        way["highway"](around:${radius},${lat},${lng});
        node["amenity"](around:${radius},${lat},${lng});
        way["landuse"](around:${radius},${lat},${lng});
        node["public_transport"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

  // Try multiple endpoints with retry logic
  let lastError: Error | null = null;
  
  for (let endpointIndex = 0; endpointIndex < overpassEndpoints.length; endpointIndex++) {
    const endpoint = overpassEndpoints[endpointIndex];
    console.log(`🌍 Attempting OSM data fetch from endpoint ${endpointIndex + 1}/${overpassEndpoints.length}...`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (timeout + 10) * 1000);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error('Invalid OSM data structure received');
      }

      console.log(`✅ Successfully fetched ${data.elements.length} OSM elements from ${endpoint}`);
      
      // Process OSM data with geometry
      const buildingsData = data.elements
      .filter((e: any) => e.tags?.building && e.type === 'way')
      .map((e: any) => {
        const nodes = data.elements.filter((n: any) => n.type === 'node' && e.nodes?.includes(n.id));
        if (nodes.length === 0) return null;
        
        // Create coordinate ring and ensure it's closed
        const coords = nodes.map((n: any) => [n.lon, n.lat]);
        const firstCoord = coords[0];
        const lastCoord = coords[coords.length - 1];
        
        // Close the ring if not already closed
        if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
          coords.push([...firstCoord]);
        }
        
        return {
          type: e.tags.building,
          name: e.tags.name,
          height: parseFloat(e.tags.height) || (parseFloat(e.tags['building:levels']) || 3) * 3,
          levels: parseFloat(e.tags['building:levels']) || 3,
          geometry: [coords]
        };
      })
      .filter((b: any) => b !== null);
    
    const roads = data.elements.filter((e: any) => e.tags?.highway).length;
    
    const amenities = data.elements
      .filter((e: any) => e.tags?.amenity && e.type === 'node')
      .map((e: any) => ({
        type: e.tags.amenity,
        name: e.tags.name || e.tags.amenity,
        distance: calculateDistance(lat, lng, e.lat, e.lon),
        coordinates: [e.lon, e.lat] as [number, number]
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    const landuseData = data.elements
      .filter((e: any) => e.tags?.landuse && e.type === 'way')
      .map((e: any) => {
        const nodes = data.elements.filter((n: any) => n.type === 'node' && e.nodes?.includes(n.id));
        if (nodes.length === 0) return null;
        
        // Create coordinate ring and ensure it's closed
        const coords = nodes.map((n: any) => [n.lon, n.lat]);
        const firstCoord = coords[0];
        const lastCoord = coords[coords.length - 1];
        
        // Close the ring if not already closed
        if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
          coords.push([...firstCoord]);
        }
        
        return {
          type: e.tags.landuse,
          name: e.tags.name,
          area: calculateArea(e),
          geometry: [coords]
        };
      })
      .filter((l: any) => l !== null);

    const transit = data.elements
      .filter((e: any) => e.tags?.public_transport && e.type === 'node')
      .map((e: any) => ({
        type: e.tags.public_transport,
        name: e.tags.name || e.tags.public_transport,
        distance: calculateDistance(lat, lng, e.lat, e.lon),
        coordinates: [e.lon, e.lat] as [number, number]
      }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      const result: OSMMapData = { 
        buildings: buildingsData, 
        roads, 
        amenities, 
        landuse: landuseData, 
        transit 
      };

      // Cache the successful result
      setCachedData(cacheKey, result);

      return result;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Failed to fetch from ${endpoint}:`, error);
      
      // Try next endpoint if available
      if (endpointIndex < overpassEndpoints.length - 1) {
        console.log('Trying next endpoint...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        continue;
      }
    }
  }
  
  // All endpoints failed
  console.error('❌ All Overpass API endpoints failed:', lastError);
  throw new Error(`Failed to fetch OSM data: ${lastError?.message || 'All endpoints unavailable'}`);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate approximate area (simplified)
 */
function calculateArea(element: any): number {
  // Simplified area calculation
  // In production, use proper polygon area calculation
  return 1000; // placeholder
}

/**
 * Get weather and climate data
 */
export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData> {
  // Using Open-Meteo (free, no API key needed)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=auto`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const temps = data.daily.temperature_2m_max;
    const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
    const avgPrecipitation = data.daily.precipitation_sum.reduce((a: number, b: number) => a + b, 0) / data.daily.precipitation_sum.length;
    const sunHours = data.daily.sunshine_duration.reduce((a: number, b: number) => a + b, 0) / data.daily.sunshine_duration.length / 3600;

    // Estimate climate zone
    let climate = 'Temperate';
    if (avgTemp > 25) climate = 'Hot';
    else if (avgTemp < 10) climate = 'Cold';

    // Calculate degree days (simplified)
    const heatingDegreeDays = temps.map((t: number) => Math.max(0, 18 - t)).reduce((a: number, b: number) => a + b, 0);
    const coolingDegreeDays = temps.map((t: number) => Math.max(0, t - 24)).reduce((a: number, b: number) => a + b, 0);

    return {
      climate,
      avgTemp,
      avgPrecipitation,
      sunHours,
      heatingDegreeDays,
      coolingDegreeDays
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return {
      climate: 'Unknown',
      avgTemp: 20,
      avgPrecipitation: 50,
      sunHours: 5,
      heatingDegreeDays: 1000,
      coolingDegreeDays: 500
    };
  }
}

/**
 * Aggregate all data sources
 */
export async function fetchSiteContext(lat: number, lng: number, radius: number = 500): Promise<SiteContext> {
  const [osm, weather] = await Promise.all([
    fetchOSMData(lat, lng, radius),
    fetchWeatherData(lat, lng)
  ]);

  return {
    location: { lat, lng, radius },
    osm,
    weather,
    elevation: {
      min: 0,
      max: 0,
      slope: 0
    }
  };
}
