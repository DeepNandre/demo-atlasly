import * as turf from '@turf/turf';

/**
 * Clip GeoJSON features to a boundary polygon
 * Returns only features that intersect with the boundary
 */
export function clipFeaturesToBoundary(
  features: any[],
  boundary: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): any[] {
  if (!features || features.length === 0) {
    return [];
  }

  // Create boundary polygon from bounds
  const boundaryPolygon = turf.bboxPolygon([
    boundary.minLng,
    boundary.minLat,
    boundary.maxLng,
    boundary.maxLat
  ]);

  const clipped: any[] = [];
  
  features.forEach((feature, index) => {
    try {
      // Validate feature has valid geometry
      if (!feature?.geometry?.coordinates) {
        console.warn(`Feature ${index} has no coordinates`);
        return;
      }
      
      // Check if feature intersects boundary
      const intersects = turf.booleanIntersects(feature, boundaryPolygon);
      
      if (intersects) {
        // For polygons and lines, clip to boundary
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          try {
            const intersection = turf.intersect(turf.featureCollection([feature, boundaryPolygon]));
            if (intersection) {
              clipped.push({
                ...feature,
                geometry: intersection.geometry
              });
            } else {
              // If no intersection geometry but intersects, keep original
              clipped.push(feature);
            }
          } catch (e: any) {
            console.warn(`Failed to clip feature ${index}: ${e.message}, keeping original`);
            // If intersection fails, keep original if it's within boundary
            clipped.push(feature);
          }
        } else if (feature.geometry.type === 'LineString') {
          // For lines, clip to boundary
          try {
            const clippedLine = turf.lineIntersect(feature, boundaryPolygon);
            if (clippedLine.features.length > 0) {
              clipped.push(feature); // Keep original line if it intersects
            }
          } catch (e) {
            clipped.push(feature);
          }
        } else if (feature.geometry.type === 'Point') {
          // For points, check if within boundary
          const point = turf.point(feature.geometry.coordinates);
          if (turf.booleanPointInPolygon(point, boundaryPolygon)) {
            clipped.push(feature);
          }
        } else {
          // Unknown type, keep it
          clipped.push(feature);
        }
      }
    } catch (error: any) {
      console.warn(`Error clipping feature ${index}: ${error.message}`);
      // On error, try to keep feature if geometry looks valid
      if (feature?.geometry?.coordinates) {
        clipped.push(feature);
      }
    }
  });

  console.log(`🔪 Clipped ${features.length} features to ${clipped.length} within boundary`);
  
  return clipped;
}

/**
 * Validate boundary has minimum required points
 */
export function validateBoundary(boundary: any): boolean {
  if (!boundary) return false;
  
  if (boundary.minLat && boundary.maxLat && boundary.minLng && boundary.maxLng) {
    // Check if bounds are valid
    const latDiff = Math.abs(boundary.maxLat - boundary.minLat);
    const lngDiff = Math.abs(boundary.maxLng - boundary.minLng);
    return latDiff > 0 && lngDiff > 0 && latDiff < 1 && lngDiff < 1; // Reasonable bounds
  }
  
  return false;
}
