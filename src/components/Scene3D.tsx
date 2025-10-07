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

function Buildings({ features, visible, centerLat, centerLng }: { features: any[]; visible: boolean; centerLat: number; centerLng: number }) {
  const meshes = useMemo(() => {
    if (!visible || features.length === 0) return [];
    
    return features.map((feature, index) => {
      if (feature.geometry.type !== 'Polygon') return null;

      const coords = feature.geometry.coordinates[0];
      
      // Get height from properties
      let height = 5; // default minimum
      if (feature.properties?.height) {
        height = parseFloat(feature.properties.height);
      } else if (feature.properties?.['building:levels']) {
        height = parseFloat(feature.properties['building:levels']) * 3.5;
      } else if (feature.properties?.levels) {
        height = parseFloat(feature.properties.levels) * 3.5;
      }

      // Convert lat/lng to local coordinates relative to center
      const points = coords.slice(0, -1).map((coord: number[]) => {
        const x = (coord[0] - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180);
        const y = (coord[1] - centerLat) * 110540;
        return new THREE.Vector2(x, y);
      });

      const shape = new THREE.Shape(points);
      
      // Calculate centroid for positioning
      const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      
      return { shape, height, key: `building-${index}`, position: [centroidX, centroidY] };
    }).filter(Boolean);
  }, [features, visible, centerLat, centerLng]);

  if (!visible || meshes.length === 0) return null;

  return (
    <group>
      {meshes.map((mesh) => mesh && (
        <mesh 
          key={mesh.key} 
          position={[mesh.position[0], mesh.height / 2, mesh.position[1]]}
          castShadow
          receiveShadow
        >
          <extrudeGeometry
            args={[
              mesh.shape,
              {
                depth: mesh.height,
                bevelEnabled: false,
              },
            ]}
          />
          <meshStandardMaterial 
            color="#d4a574" 
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function Roads({ features, visible, centerLat, centerLng }: { features: any[]; visible: boolean; centerLat: number; centerLng: number }) {
  const lines = useMemo(() => {
    if (!visible || features.length === 0) return [];
    
    return features.map((feature, index) => {
      if (feature.geometry.type !== 'LineString') return null;

      const coords = feature.geometry.coordinates;
      const points = coords.map((coord: number[]) => {
        const x = (coord[0] - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180);
        const y = (coord[1] - centerLat) * 110540;
        return new THREE.Vector3(x, 0.5, y);
      });

      return { points, key: `road-${index}` };
    }).filter(Boolean);
  }, [features, visible, centerLat, centerLng]);

  if (!visible || lines.length === 0) return null;

  return (
    <group>
      {lines.map((line) => {
        if (!line) return null;
        
        const geometry = new THREE.BufferGeometry().setFromPoints(line.points);
        const material = new THREE.LineBasicMaterial({ 
          color: '#555555',
          linewidth: 2
        });
        
        return (
          <primitive key={line.key} object={new THREE.Line(geometry, material)} />
        );
      })}
    </group>
  );
}

function Terrain({ features, visible, centerLat, centerLng }: { features: any[]; visible: boolean; centerLat: number; centerLng: number }) {
  if (!visible || features.length === 0) return null;

  const points = useMemo(() => {
    return features.slice(0, 200).map((feature, index) => {
      if (feature.geometry.type !== 'Point') return null;
      
      const [lng, lat, elevation = 0] = feature.geometry.coordinates;
      const x = (lng - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180);
      const z = (lat - centerLat) * 110540;
      
      return { 
        position: [x, elevation, z],
        elevation,
        key: `terrain-${index}`
      };
    }).filter(Boolean);
  }, [features, visible, centerLat, centerLng]);

  return (
    <group>
      {points.map((point) => point && (
        <mesh
          key={point.key}
          position={point.position as [number, number, number]}
        >
          <sphereGeometry args={[2, 8, 8]} />
          <meshStandardMaterial 
            color="#90EE90" 
            opacity={0.6} 
            transparent 
          />
        </mesh>
      ))}
    </group>
  );
}

export function Scene3D({ buildings, roads, terrain, layers, aoiBounds }: Scene3DProps) {
  const controlsRef = useRef<any>();

  // Calculate center point from aoiBounds
  const centerLat = aoiBounds ? (aoiBounds.minLat + aoiBounds.maxLat) / 2 : 0;
  const centerLng = aoiBounds ? (aoiBounds.minLng + aoiBounds.maxLng) / 2 : 0;

  // Calculate camera distance based on area size
  const cameraDistance = useMemo(() => {
    if (!aoiBounds) return 500;
    const latSpan = aoiBounds.maxLat - aoiBounds.minLat;
    const lngSpan = aoiBounds.maxLng - aoiBounds.minLng;
    const maxSpan = Math.max(latSpan, lngSpan) * 111000;
    return maxSpan * 1.5;
  }, [aoiBounds]);

  return (
    <Canvas
      camera={{
        position: [cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7],
        fov: 50,
      }}
      shadows
    >
      <color attach="background" args={['#e8f4f8']} />
      
      {/* Lighting setup */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[100, 200, 100]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={1000}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
      />
      <hemisphereLight intensity={0.5} groundColor="#444444" />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#c8d6b9" roughness={0.9} />
      </mesh>
      
      <Buildings 
        features={buildings} 
        visible={layers.buildings}
        centerLat={centerLat}
        centerLng={centerLng}
      />
      <Roads 
        features={roads} 
        visible={layers.roads}
        centerLat={centerLat}
        centerLng={centerLng}
      />
      <Terrain 
        features={terrain} 
        visible={layers.terrain}
        centerLat={centerLat}
        centerLng={centerLng}
      />
      
      <Grid
        args={[2000, 2000]}
        cellSize={20}
        cellThickness={0.5}
        cellColor="#999999"
        sectionSize={100}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={1500}
        fadeStrength={1}
        followCamera={false}
      />
      
      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={cameraDistance * 3}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
