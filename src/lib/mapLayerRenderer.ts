import { fetchOSMData } from './dataFusion';

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

export const fetchRealMapData = async (lat: number, lng: number, radius: number = 500) => {
  try {
    const osmData = await fetchOSMData(lat, lng, radius);
    
    // Transform buildings to GeoJSON
    const buildingsGeoJSON = {
      type: 'FeatureCollection',
      features: osmData.buildings.map(building => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: building.geometry || []
        },
        properties: {
          name: building.name || 'Unnamed Building',
          height: building.height || 10,
          levels: building.levels || 3
        }
      }))
    };

    // Transform landuse to GeoJSON with type-based styling
    const landuseGeoJSON = {
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
    const transitGeoJSON = {
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
    const amenitiesGeoJSON = {
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

    return {
      buildings: buildingsGeoJSON,
      landuse: landuseGeoJSON,
      transit: transitGeoJSON,
      amenities: amenitiesGeoJSON,
      stats: {
        buildingCount: osmData.buildings.length,
        transitCount: osmData.transit.length,
        amenityCount: osmData.amenities.length,
        landuseTypes: [...new Set(osmData.landuse.map(l => l.type))]
      }
    };
  } catch (error) {
    console.error('Error fetching map data:', error);
    return null;
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
