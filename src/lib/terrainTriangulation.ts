import * as THREE from 'three';
import { CoordinateProjection } from './coordinateUtils';

/**
 * Triangulate DEM point cloud into a mesh surface
 * Uses improved inverse distance weighted interpolation for smooth terrain
 */
export function triangulateTerrain(
  terrainFeatures: any[],
  projection: CoordinateProjection
): THREE.BufferGeometry | null {
  if (terrainFeatures.length === 0) {
    return null;
  }

  // Extract elevation points
  const points = terrainFeatures
    .filter(f => f.geometry.type === 'Point' && f.geometry.coordinates[2] !== undefined)
    .map(f => {
      const [lng, lat, elevation] = f.geometry.coordinates;
      const { x, y } = projection.latLngToXY(lat, lng);
      return { x, y, elevation };
    });

  if (points.length < 3) {
    console.warn('🏔️ Not enough terrain points for triangulation:', points.length);
    return null;
  }

  console.log('🏔️ Triangulating terrain with', points.length, 'elevation points');

  // Group points into a regular grid for efficient triangulation
  const gridSize = 30; // Finer grid cell size in meters
  const grid: Map<string, { x: number; y: number; elevation: number; count: number }> = new Map();

  points.forEach(point => {
    const gridX = Math.floor(point.x / gridSize);
    const gridY = Math.floor(point.y / gridSize);
    const key = `${gridX},${gridY}`;
    
    // Average elevation for points in same grid cell
    if (grid.has(key)) {
      const existing = grid.get(key)!;
      existing.elevation = (existing.elevation * existing.count + point.elevation) / (existing.count + 1);
      existing.count++;
    } else {
      grid.set(key, { ...point, count: 1 });
    }
  });

  const gridPoints = Array.from(grid.values());
  console.log(`📐 Reduced to ${gridPoints.length} grid points`);

  // Find bounds
  const xs = gridPoints.map(p => p.x);
  const ys = gridPoints.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Adaptive grid resolution based on point density
  const area = (maxX - minX) * (maxY - minY);
  const pointDensity = gridPoints.length / area;
  const gridResolution = Math.min(Math.max(Math.floor(Math.sqrt(gridPoints.length) / 2), 15), 40);
  
  console.log(`📊 Terrain metrics: area=${area.toFixed(0)}m², density=${pointDensity.toFixed(6)}, resolution=${gridResolution}`);

  const stepX = (maxX - minX) / gridResolution;
  const stepY = (maxY - minY) / gridResolution;

  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Generate vertex grid with inverse distance weighted interpolation
  for (let i = 0; i <= gridResolution; i++) {
    for (let j = 0; j <= gridResolution; j++) {
      const x = minX + i * stepX;
      const y = minY + j * stepY;
      
      // Inverse distance weighted interpolation (IDW)
      let weightedElevation = 0;
      let totalWeight = 0;
      const maxInfluence = gridSize * 3; // Influence radius
      
      for (const p of gridPoints) {
        const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
        
        if (dist < 0.01) {
          // Very close point - use its elevation directly
          weightedElevation = p.elevation;
          totalWeight = 1;
          break;
        }
        
        if (dist < maxInfluence) {
          const weight = 1 / (dist * dist); // Inverse square distance
          weightedElevation += p.elevation * weight;
          totalWeight += weight;
        }
      }
      
      const elevation = totalWeight > 0 ? weightedElevation / totalWeight : 0;

      vertices.push(x, elevation, y);
      
      // Enhanced color gradient based on elevation
      const color = elevationToColor(elevation);
      colors.push(color[0], color[1], color[2]);
    }
  }

  // Create triangle indices with proper winding
  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const idx = i * (gridResolution + 1) + j;
      const idx2 = idx + 1;
      const idx3 = idx + gridResolution + 1;
      const idx4 = idx3 + 1;

      // Two triangles per quad with consistent winding
      indices.push(idx, idx3, idx2);
      indices.push(idx2, idx3, idx4);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  console.log('🏔️ Created terrain mesh:', {
    vertices: vertices.length / 3,
    triangles: indices.length / 3,
  });

  return geometry;
}

/**
 * Snap building polygons to terrain surface
 */
export function snapBuildingToTerrain(
  buildingCoords: number[][],
  projection: CoordinateProjection,
  terrainGeometry: THREE.BufferGeometry | null
): number {
  if (!terrainGeometry) return 0;

  // Calculate centroid of building
  const centroid = buildingCoords.reduce(
    (acc, coord) => {
      const { x, y } = projection.latLngToXY(coord[1], coord[0]);
      return { x: acc.x + x, y: acc.y + y, count: acc.count + 1 };
    },
    { x: 0, y: 0, count: 0 }
  );
  
  const centerX = centroid.x / centroid.count;
  const centerY = centroid.y / centroid.count;

  // Raycast down from above to find terrain height
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(centerX, 1000, centerY),
    new THREE.Vector3(0, -1, 0)
  );

  const tempMesh = new THREE.Mesh(terrainGeometry);
  const intersects = raycaster.intersectObject(tempMesh);

  if (intersects.length > 0) {
    return intersects[0].point.y; // Y is elevation in our coordinate system
  }

  return 0; // Default to ground level
}

/**
 * Map elevation to color (green -> brown -> white for snow)
 */
function elevationToColor(elevation: number): [number, number, number] {
  const normalized = Math.min(Math.max(elevation / 200, 0), 1);
  
  if (normalized < 0.3) {
    // Green for low elevation
    return [0.3 + normalized * 0.2, 0.6 - normalized * 0.2, 0.2];
  } else if (normalized < 0.7) {
    // Brown for mid elevation
    return [0.5 + normalized * 0.2, 0.4 - normalized * 0.1, 0.2];
  } else {
    // White-ish for high elevation (snow)
    return [0.8 + normalized * 0.2, 0.8 + normalized * 0.2, 0.9];
  }
}
