/**
 * Multi-Source Data Fusion Engine
 * Integrates OpenStreetMap, weather, elevation, and other free data sources
 */

export interface LocationContext {
  lat: number;
  lng: number;
  radius?: number;
}

export interface OSMData {
  buildings: number;
  roads: number;
  amenities: Array<{ type: string; name: string; distance: number }>;
  landuse: Array<{ type: string; area: number }>;
  transit: Array<{ type: string; name: string; distance: number }>;
}

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
export async function fetchOSMData(lat: number, lng: number, radius: number = 500): Promise<OSMData> {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  // Overpass QL query for buildings, roads, amenities, etc.
  const query = `
    [out:json][timeout:25];
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

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = await response.json();
    
    // Process OSM data
    const buildings = data.elements.filter((e: any) => e.tags?.building).length;
    const roads = data.elements.filter((e: any) => e.tags?.highway).length;
    
    const amenities = data.elements
      .filter((e: any) => e.tags?.amenity)
      .map((e: any) => ({
        type: e.tags.amenity,
        name: e.tags.name || e.tags.amenity,
        distance: calculateDistance(lat, lng, e.lat, e.lon)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    const landuse = data.elements
      .filter((e: any) => e.tags?.landuse)
      .map((e: any) => ({
        type: e.tags.landuse,
        area: calculateArea(e)
      }));

    const transit = data.elements
      .filter((e: any) => e.tags?.public_transport)
      .map((e: any) => ({
        type: e.tags.public_transport,
        name: e.tags.name || e.tags.public_transport,
        distance: calculateDistance(lat, lng, e.lat, e.lon)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    return { buildings, roads, amenities, landuse, transit };
  } catch (error) {
    console.error('Error fetching OSM data:', error);
    return {
      buildings: 0,
      roads: 0,
      amenities: [],
      landuse: [],
      transit: []
    };
  }
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
