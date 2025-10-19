import { fetchOSMData } from './dataFusion';
import { clipFeaturesToBoundary } from './boundaryClipping';

export interface LayerStyle {
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeWidth: number;
}

export const layerStyles = {
  buildings: {
    fillColor: '#FFD700',
    strokeColor: '#FFA500',
    fillOpacity: 0.5,
    strokeWidth: 2
  },
  residential: {
    fillColor: '#FF69B4',
    strokeColor: '#FF1493',
    fillOpacity: 0.3,
    strokeWidth: 1
  },
  commercial: {
    fillColor: '#4169E1',
    strokeColor: '#0000CD',
    fillOpacity: 0.3,
    strokeWidth: 1
  },
  industrial: {
    fillColor: '#A9A9A9',
    strokeColor: '#696969',
    fillOpacity: 0.3,
    strokeWidth: 1
  },
  park: {
    fillColor: '#00FF00',
    strokeColor: '#008000',
    fillOpacity: 0.4,
    strokeWidth: 1
  },
  forest: {
    fillColor: '#228B22',
    strokeColor: '#006400',
    fillOpacity: 0.4,
    strokeWidth: 1
  },
  transit: {
    circleColor: '#1E90FF',
    circleRadius: 6,
    strokeColor: '#FFFFFF',
    strokeWidth: 2
  },
  amenity: {
    circleColor: '#FF6347',
    circleRadius: 5,
    strokeColor: '#FFFFFF',
    strokeWidth: 2
  }
};

export const fetchRealMapData = async (
  lat: number, 
  lng: number, 
  radius: number = 500,
  boundaryPolygon?: any
) => {
  try {
    // Calculate bounding box from polygon if provided
    let bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | undefined;
    if (boundaryPolygon?.geometry?.coordinates?.[0]) {
      const coords = boundaryPolygon.geometry.coordinates[0];
      const lngs = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      bbox = {
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats)
      };
      console.log('🗺️ Using boundary box:', bbox);
    }

    const osmData = await fetchOSMData(lat, lng, radius, bbox);
    
    // Transform buildings to GeoJSON with enhanced properties
    let buildingsGeoJSON = {
      type: 'FeatureCollection',
      features: osmData.buildings.map(building => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: building.geometry || []
        },
        properties: {
          name: building.name || 'Unnamed Building',
          height: building.height || (building.levels ? building.levels * 3.5 : 15), // Use levels * 3.5m or default 15m
          baseHeight: 0, // CRITICAL FIX: Base should ALWAYS be 0 for ground-level buildings
          levels: building.levels || 3,
          roofShape: building.roofShape || 'flat',
          roofHeight: building.roofHeight || 0,
          roofDirection: building.roofDirection || 0,
          buildingPart: building.buildingPart || false
        }
      }))
    };

    // Transform roads to GeoJSON with enhanced properties
    let roadsGeoJSON = {
      type: 'FeatureCollection',
      features: (osmData.roadsData || []).map(road => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: road.geometry || []
        },
        properties: {
          name: road.name || 'Unnamed Road',
          type: road.type,
          lanes: road.lanes || 1,
          width: road.width || 3.5,
          surface: road.surface || 'asphalt',
          maxspeed: road.maxspeed,
          oneway: road.oneway || false,
          category: road.category || 'minor'
        }
      }))
    };

    // Transform landuse to GeoJSON with type-based styling
    let landuseGeoJSON = {
      type: 'FeatureCollection',
      features: osmData.landuse.map(land => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: land.geometry || []
        },
        properties: {
          type: land.type,
          name: land.name || `${land.type} area`
        }
      }))
    };

    // Transform transit stops to GeoJSON points
    let transitGeoJSON = {
      type: 'FeatureCollection',
      features: osmData.transit.map(stop => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: stop.coordinates
        },
        properties: {
          name: stop.name || 'Transit Stop',
          type: stop.type
        }
      }))
    };

    // Transform amenities to GeoJSON points
    let amenitiesGeoJSON = {
      type: 'FeatureCollection',
      features: osmData.amenities.map(amenity => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: amenity.coordinates
        },
        properties: {
          name: amenity.name || 'Amenity',
          type: amenity.type
        }
      }))
    };

    // CLIP ALL LAYERS to boundary polygon for precise filtering
    if (boundaryPolygon && bbox) {
      console.log('🔪 Clipping features to boundary polygon...');
      console.log('Before clipping:', {
        buildings: buildingsGeoJSON.features.length,
        landuse: landuseGeoJSON.features.length,
        transit: transitGeoJSON.features.length,
        amenities: amenitiesGeoJSON.features.length
      });
      
      buildingsGeoJSON.features = clipFeaturesToBoundary(buildingsGeoJSON.features, bbox);
      landuseGeoJSON.features = clipFeaturesToBoundary(landuseGeoJSON.features, bbox);
      transitGeoJSON.features = clipFeaturesToBoundary(transitGeoJSON.features, bbox);
      amenitiesGeoJSON.features = clipFeaturesToBoundary(amenitiesGeoJSON.features, bbox);
      
      console.log('✅ After clipping (within boundary):', {
        buildings: buildingsGeoJSON.features.length,
        landuse: landuseGeoJSON.features.length,
        transit: transitGeoJSON.features.length,
        amenities: amenitiesGeoJSON.features.length
      });
    }

    // CLIP roads to boundary
    if (boundaryPolygon && bbox) {
      roadsGeoJSON.features = clipFeaturesToBoundary(roadsGeoJSON.features, bbox);
      console.log('✅ Roads clipped:', roadsGeoJSON.features.length);
    }

    return {
      buildings: buildingsGeoJSON,
      landuse: landuseGeoJSON,
      transit: transitGeoJSON,
      amenities: amenitiesGeoJSON,
      roads: roadsGeoJSON,
      stats: {
        buildingCount: buildingsGeoJSON.features.length,
        transitCount: transitGeoJSON.features.length,
        amenityCount: amenitiesGeoJSON.features.length,
        roadsCount: roadsGeoJSON.features.length,
        landuseTypes: [...new Set(landuseGeoJSON.features.map((l: any) => l.properties?.type))]
      }
    };
  } catch (error: any) {
    console.error('❌ Error fetching and clipping map data:', error);
    throw new Error(error.message || 'Failed to fetch map data');
  }
};

export const calculateLayerStats = (geoJSON: any) => {
  if (!geoJSON || !geoJSON.features) return null;

  const featureCount = geoJSON.features.length;
  const types = geoJSON.features.reduce((acc: any, feature: any) => {
    const type = feature.properties?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return { count: featureCount, types };
};

export const getLanduseColor = (type: string): string => {
  const colors: { [key: string]: string } = {
    residential: '#FF69B4',
    commercial: '#4169E1',
    industrial: '#A9A9A9',
    park: '#00FF00',
    forest: '#228B22',
    grass: '#90EE90',
    meadow: '#98FB98',
    farmland: '#F0E68C',
    retail: '#87CEEB',
    default: '#CCCCCC'
  };
  
  return colors[type] || colors.default;
};

export const getAmenityIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    school: '🏫',
    hospital: '🏥',
    restaurant: '🍽️',
    cafe: '☕',
    bank: '🏦',
    pharmacy: '💊',
    parking: '🅿️',
    fuel: '⛽',
    default: '📍'
  };
  
  return icons[type] || icons.default;
};
