import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

interface Scene3DProps {
  buildings: any[];
  roads: any[];
  terrain: any[];
  layers: {
    buildings: boolean;
    roads: boolean;
    terrain: boolean;
  };
  aoiBounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

function Buildings({ features, visible }: { features: any[]; visible: boolean }) {
  const meshes = useMemo(() => {
    return features.map((feature, index) => {
      if (feature.geometry.type !== 'Polygon') return null;

      const coords = feature.geometry.coordinates[0];
      
      // Get height from tags
      let height = 10; // default
      if (feature.properties?.height) {
        height = parseFloat(feature.properties.height);
      } else if (feature.properties?.['building:levels']) {
        height = parseFloat(feature.properties['building:levels']) * 3.2;
      }

      // Convert lat/lng to local coordinates (simplified)
      const points = coords.slice(0, -1).map((coord: number[]) => 
        new THREE.Vector2(coord[0] * 111000, coord[1] * 111000)
      );

      const shape = new THREE.Shape(points);
      
      return { shape, height, key: `building-${index}` };
    }).filter(Boolean);
  }, [features]);

  if (!visible) return null;

  return (
    <group>
      {meshes.map((mesh) => mesh && (
        <mesh key={mesh.key} position={[0, mesh.height / 2, 0]}>
          <extrudeGeometry
            args={[
              mesh.shape,
              {
                depth: mesh.height,
                bevelEnabled: false,
              },
            ]}
          />
          <meshStandardMaterial color="#8B7355" />
        </mesh>
      ))}
    </group>
  );
}

function Roads({ features, visible }: { features: any[]; visible: boolean }) {
  const lines = useMemo(() => {
    return features.map((feature, index) => {
      if (feature.geometry.type !== 'LineString') return null;

      const coords = feature.geometry.coordinates;
      const points = coords.map((coord: number[]) =>
        new THREE.Vector3(coord[0] * 111000, 0.5, coord[1] * 111000)
      );

      return { points, key: `road-${index}` };
    }).filter(Boolean);
  }, [features]);

  if (!visible) return null;

  return (
    <group>
      {lines.map((line) => {
        if (!line) return null;
        
        const geometry = new THREE.BufferGeometry().setFromPoints(line.points);
        
        return (
          <primitive key={line.key} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#666666' }))} />
        );
      })}
    </group>
  );
}

function Terrain({ features, visible }: { features: any[]; visible: boolean }) {
  if (!visible || features.length === 0) return null;

  // Simple terrain visualization using elevation points
  return (
    <group>
      {features.slice(0, 100).map((feature, index) => {
        if (feature.geometry.type !== 'Point') return null;
        
        const [lng, lat, elevation] = feature.geometry.coordinates;
        
        return (
          <mesh
            key={`terrain-${index}`}
            position={[lng * 111000, elevation || 0, lat * 111000]}
          >
            <sphereGeometry args={[50, 8, 8]} />
            <meshStandardMaterial color="#90EE90" opacity={0.6} transparent />
          </mesh>
        );
      })}
    </group>
  );
}

export function Scene3D({ buildings, roads, terrain, layers, aoiBounds }: Scene3DProps) {
  const controlsRef = useRef<any>();

  // Calculate center point for camera positioning
  const centerPoint = useMemo<[number, number, number]>(() => {
    if (!aoiBounds) return [0, 0, 0];
    
    const centerLat = (aoiBounds.minLat + aoiBounds.maxLat) / 2;
    const centerLng = (aoiBounds.minLng + aoiBounds.maxLng) / 2;
    
    return [centerLng * 111000, 0, centerLat * 111000];
  }, [aoiBounds]);

  return (
    <Canvas
      camera={{
        position: [centerPoint[0] + 1000, 500, centerPoint[2] + 1000],
        fov: 60,
      }}
      shadows
    >
      <color attach="background" args={['#87CEEB']} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[1000, 1000, 1000]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      <Buildings features={buildings} visible={layers.buildings} />
      <Roads features={roads} visible={layers.roads} />
      <Terrain features={terrain} visible={layers.terrain} />
      
      <Grid
        args={[10000, 10000]}
        cellSize={100}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={500}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={5000}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      
      <OrbitControls
        ref={controlsRef}
        target={centerPoint}
        enableDamping
        dampingFactor={0.05}
        minDistance={100}
        maxDistance={5000}
      />
    </Canvas>
  );
}
