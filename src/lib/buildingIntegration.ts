/**
 * Building massing integration for shadow analysis
 * Extracts building footprints and heights from site pack GeoJSON data
 */

import type { BuildingMassing } from './shadowEngine';

export interface BuildingFeature {
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    height?: number;
    levels?: number;
    'building:levels'?: number;
    name?: string;
    building?: string;
  };
}

/**
 * Convert GeoJSON buildings to BuildingMassing format for shadow analysis
 * Handles various OSM tagging schemes for building heights
 */
export function extractBuildingMassing(
  buildingFeatures: BuildingFeature[],
  centerLat: number,
  centerLng: number
): BuildingMassing[] {
  console.log('🏢 Extracting building massing from', buildingFeatures.length, 'features');
  
  const buildings: BuildingMassing[] = [];
  
  buildingFeatures.forEach((feature, idx) => {
    if (feature.geometry.type !== 'Polygon') {
      return; // Skip non-polygons
    }
    
    const coords = feature.geometry.coordinates[0];
    if (!coords || coords.length < 3) {
      return; // Invalid polygon
    }
    
    // Get building height (in meters)
    const props = feature.properties || {};
    let height = 10; // Default height
    
    if (props.height) {
      height = parseFloat(props.height.toString());
    } else if (props.levels || props['building:levels']) {
      const levels = parseFloat((props.levels || props['building:levels']).toString());
      height = levels * 3.5; // Typical floor height
    }
    
    // Convert geographic coordinates to local meters
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos(centerLat * Math.PI / 180);
    
    const footprint: [number, number][] = coords.map(coord => {
      const [lng, lat] = coord;
      const x = (lng - centerLng) * metersPerDegreeLng;
      const y = (lat - centerLat) * metersPerDegreeLat;
      return [x, y];
    });
    
    buildings.push({
      id: `building-${idx}`,
      footprint,
      heightMeters: height
    });
  });
  
  console.log('✅ Extracted', buildings.length, 'buildings with heights');
  
  return buildings;
}

/**
 * Validate building data quality
 */
export function validateBuildingData(buildings: BuildingMassing[]): {
  valid: boolean;
  warnings: string[];
  stats: {
    total: number;
    withDefaultHeight: number;
    avgHeight: number;
    maxHeight: number;
  };
} {
  const warnings: string[] = [];
  
  if (buildings.length === 0) {
    warnings.push('No buildings found in site data');
  }
  
  const heights = buildings.map(b => b.heightMeters);
  const defaultHeightCount = heights.filter(h => h === 10).length;
  const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
  const maxHeight = Math.max(...heights);
  
  if (defaultHeightCount > buildings.length * 0.5) {
    warnings.push(`${defaultHeightCount} buildings using default height (10m) - may affect accuracy`);
  }
  
  if (maxHeight > 100) {
    warnings.push(`Unusually tall building detected (${maxHeight}m) - verify data`);
  }
  
  return {
    valid: buildings.length > 0,
    warnings,
    stats: {
      total: buildings.length,
      withDefaultHeight: defaultHeightCount,
      avgHeight,
      maxHeight
    }
  };
}
