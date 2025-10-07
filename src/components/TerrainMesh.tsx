import { useMemo } from 'react';
import * as THREE from 'three';
import { CoordinateProjection } from '@/lib/coordinateUtils';

interface TerrainMeshProps {
  features: any[];
  visible: boolean;
  projection: CoordinateProjection;
}

export function TerrainMesh({ features, visible, projection }: TerrainMeshProps) {
  const terrainGeometry = useMemo(() => {
    if (!visible || features.length === 0) {
      console.log('🏔️ Terrain: no features to render');
      return null;
    }

    console.log('🏔️ Building terrain mesh from', features.length, 'point features');

    // Extract points with elevation
    const points = features
      .slice(0, 5000) // Limit for performance
      .filter(f => f.geometry.type === 'Point')
      .map(f => {
        const [lng, lat, elevation = 0] = f.geometry.coordinates;
        const { x, y } = projection.latLngToXY(lat, lng);
        return { x, y, z: elevation };
      });

    if (points.length === 0) {
      console.log('🏔️ No valid terrain points found');
      return null;
    }

    console.log('🏔️ First terrain point:', {
      x: points[0].x.toFixed(2),
      y: points[0].y.toFixed(2),
      z: points[0].z.toFixed(2)
    });

    // Create point cloud geometry
    const vertices = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);

    points.forEach((point, i) => {
      vertices[i * 3] = point.x;
      vertices[i * 3 + 1] = point.z; // elevation as Y
      vertices[i * 3 + 2] = point.y;

      // Color based on elevation (green to brown)
      const normalizedHeight = Math.min(Math.max(point.z / 100, 0), 1);
      colors[i * 3] = 0.4 + normalizedHeight * 0.3; // R
      colors[i * 3 + 1] = 0.6 - normalizedHeight * 0.2; // G
      colors[i * 3 + 2] = 0.2; // B
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    console.log('🏔️ Created terrain geometry with', points.length, 'points');

    return geometry;
  }, [features, visible, projection]);

  if (!visible || !terrainGeometry) {
    return null;
  }

  return (
    <points geometry={terrainGeometry}>
      <pointsMaterial
        size={3}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
}
