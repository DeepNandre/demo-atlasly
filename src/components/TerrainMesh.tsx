import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, BufferGeometry, Material } from 'three';
import * as THREE from 'three';
import { triangulateTerrain, snapBuildingToTerrain } from '@/lib/terrainTriangulation';
import { CoordinateProjection } from '@/lib/coordinateUtils';

interface TerrainMeshProps {
  /** GeoJSON features containing elevation data */
  terrainFeatures: any[];
  /** Coordinate projection instance for transformations */
  projection: CoordinateProjection;
  /** Whether to show wireframe overlay */
  showWireframe?: boolean;
  /** Terrain opacity for layering */
  opacity?: number;
  /** Whether the terrain should animate/pulse */
  animate?: boolean;
  /** Color mode for terrain */
  colorMode?: 'elevation' | 'slope' | 'flat';
  /** Terrain scale factor for vertical exaggeration */
  verticalScale?: number;
}

/**
 * TerrainMesh component for 3D terrain visualization
 * Uses Delaunay triangulation for smooth surface generation
 * Supports elevation-based coloring and material properties
 */
export const TerrainMesh: React.FC<TerrainMeshProps> = ({
  terrainFeatures,
  projection,
  showWireframe = false,
  opacity = 1.0,
  animate = false,
  colorMode = 'elevation',
  verticalScale = 1.0
}) => {
  const meshRef = useRef<Mesh>(null);
  const wireframeRef = useRef<Mesh>(null);

  // Generate terrain geometry from elevation data
  const terrainGeometry = useMemo(() => {
    if (!terrainFeatures || terrainFeatures.length === 0) {
      return null;
    }

    console.log('🏔️ TerrainMesh: Creating geometry from', terrainFeatures.length, 'features');
    const geometry = triangulateTerrain(terrainFeatures, projection);
    
    if (geometry && verticalScale !== 1.0) {
      // Apply vertical scaling to terrain
      const positions = geometry.getAttribute('position');
      for (let i = 1; i < positions.count * 3; i += 3) {
        positions.array[i] *= verticalScale;
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    return geometry;
  }, [terrainFeatures, projection, verticalScale]);

  // Create terrain material
  const terrainMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: colorMode === 'elevation',
      color: colorMode === 'flat' ? 0x8fbc8f : undefined,
      opacity,
      transparent: opacity < 1.0,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
    });
  }, [colorMode, opacity]);

  // Create wireframe material
  const wireframeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0x444444,
      wireframe: true,
      opacity: 0.3,
      transparent: true,
    });
  }, []);

  // Animation frame for terrain effects
  useFrame((state) => {
    if (animate && meshRef.current) {
      // Subtle animation - could be used for water simulation or gentle movement
      const time = state.clock.getElapsedTime();
      const material = meshRef.current.material;
      if (!Array.isArray(material) && 'opacity' in material) {
        material.opacity = opacity * (0.9 + 0.1 * Math.sin(time));
      }
    }
  });

  // Update material when colorMode changes
  useEffect(() => {
    if (meshRef.current && terrainGeometry) {
      if (colorMode === 'slope') {
        // Calculate slope-based colors
        const geometry = terrainGeometry;
        const positions = geometry.getAttribute('position');
        const normals = geometry.getAttribute('normal');
        const colors = new Float32Array(positions.count * 3);

        for (let i = 0; i < positions.count; i++) {
          const normal = new THREE.Vector3(
            normals.getX(i),
            normals.getY(i),
            normals.getZ(i)
          );
          
          // Calculate slope based on normal (steeper = more red)
          const slope = 1 - Math.abs(normal.y);
          colors[i * 3] = slope * 0.8 + 0.2; // Red
          colors[i * 3 + 1] = (1 - slope) * 0.6 + 0.2; // Green
          colors[i * 3 + 2] = 0.2; // Blue
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        terrainMaterial.vertexColors = true;
        terrainMaterial.needsUpdate = true;
      }
    }
  }, [colorMode, terrainGeometry, terrainMaterial]);

  if (!terrainGeometry) {
    return null;
  }

  return (
    <group>
      {/* Main terrain mesh */}
      <mesh
        ref={meshRef}
        geometry={terrainGeometry}
        material={terrainMaterial}
        receiveShadow
        castShadow
      />
      
      {/* Optional wireframe overlay */}
      {showWireframe && (
        <mesh
          ref={wireframeRef}
          geometry={terrainGeometry}
          material={wireframeMaterial}
          position={[0, 0.1, 0]} // Slightly elevated to avoid z-fighting
        />
      )}
    </group>
  );
};

/**
 * Hook to get terrain height at specific coordinates
 * Useful for snapping buildings and objects to terrain surface
 */
export const useTerrainHeight = (
  terrainFeatures: any[],
  projection: CoordinateProjection
) => {
  const terrainGeometry = useMemo(() => {
    return triangulateTerrain(terrainFeatures, projection);
  }, [terrainFeatures, projection]);

  const getHeightAt = (lat: number, lng: number): number => {
    if (!terrainGeometry) return 0;

    const { x, y } = projection.latLngToXY(lat, lng);
    
    // Raycast down to find terrain height
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(x, 1000, y),
      new THREE.Vector3(0, -1, 0)
    );

    const tempMesh = new THREE.Mesh(terrainGeometry);
    const intersects = raycaster.intersectObject(tempMesh);

    if (intersects.length > 0) {
      return intersects[0].point.y;
    }

    return 0;
  };

  const snapBuildingToSurface = (buildingCoords: number[][]): number => {
    return snapBuildingToTerrain(buildingCoords, projection, terrainGeometry);
  };

  return {
    getHeightAt,
    snapBuildingToSurface,
    hasTerrainData: !!terrainGeometry
  };
};

export default TerrainMesh;