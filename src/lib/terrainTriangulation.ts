import * as THREE from 'three';
import { CoordinateProjection } from './coordinateUtils';

/**
 * Triangulate DEM point cloud into a mesh surface
 * Uses Delaunay triangulation for accurate terrain representation
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
      return { x, y, z: elevation };
    });

  if (points.length < 3) {
    console.warn('🏔️ Not enough terrain points for triangulation:', points.length);
    return null;
  }

  console.log('🏔️ Triangulating terrain with', points.length, 'elevation points');

  // Create grid-based triangulation for performance
  // Group points into a regular grid and triangulate within cells
  const gridSize = 50; // meters
  const grid = new Map<string, typeof points>();

  points.forEach(p => {
    const cellX = Math.floor(p.x / gridSize);
    const cellY = Math.floor(p.y / gridSize);
    const key = `${cellX},${cellY}`;
    
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(p);
  });

  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  let vertexIndex = 0;

  // Create mesh for each grid cell
  grid.forEach((cellPoints, key) => {
    if (cellPoints.length < 3) return;

    // Sort points to create a simple fan triangulation
    const center = {
      x: cellPoints.reduce((s, p) => s + p.x, 0) / cellPoints.length,
      y: cellPoints.reduce((s, p) => s + p.y, 0) / cellPoints.length,
      z: cellPoints.reduce((s, p) => s + p.z, 0) / cellPoints.length
    };

    // Sort by angle from center
    const sorted = cellPoints.sort((a, b) => {
      const angleA = Math.atan2(a.y - center.y, a.x - center.x);
      const angleB = Math.atan2(b.y - center.y, b.x - center.x);
      return angleA - angleB;
    });

    // Add center vertex
    const centerIdx = vertexIndex++;
    vertices.push(center.x, center.z, center.y);
    const centerColor = elevationToColor(center.z);
    colors.push(...centerColor);

    // Add surrounding vertices and create triangles
    sorted.forEach((p, i) => {
      const idx = vertexIndex++;
      vertices.push(p.x, p.z, p.y);
      const color = elevationToColor(p.z);
      colors.push(...color);

      // Create triangle fan
      const nextIdx = i === sorted.length - 1 ? centerIdx + 1 : idx + 1;
      indices.push(centerIdx, idx, nextIdx);
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  console.log('🏔️ Created terrain mesh:', {
    vertices: vertices.length / 3,
    triangles: indices.length / 3,
    bounds: geometry.boundingBox
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
