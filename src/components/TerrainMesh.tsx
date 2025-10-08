import { useMemo } from 'react';
import * as THREE from 'three';
import { CoordinateProjection } from '@/lib/coordinateUtils';
import { triangulateTerrain } from '@/lib/terrainTriangulation';

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

    console.log('🏔️ Building triangulated terrain mesh from', features.length, 'point features');

    // Use advanced triangulation for smooth terrain surface
    const geometry = triangulateTerrain(features, projection);

    if (!geometry) {
      console.log('🏔️ Triangulation failed');
      return null;
    }

    console.log('🏔️ Created triangulated terrain geometry');
    return geometry;
  }, [features, visible, projection]);

  if (!visible || !terrainGeometry) {
    return null;
  }

  return (
    <mesh geometry={terrainGeometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        metalness={0.1}
        wireframe={false}
      />
    </mesh>
  );
}
