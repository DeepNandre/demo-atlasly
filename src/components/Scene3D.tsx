import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { CoordinateProjection, calculateBounds } from '@/lib/coordinateUtils';

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

function Buildings({ features, visible, projection }: { features: any[]; visible: boolean; projection: CoordinateProjection }) {
  const meshes = useMemo(() => {
    if (!visible || features.length === 0) {
      console.log('🏢 Buildings: no features to render');
      return [];
    }
    
    console.log('🏢 Building meshes from', features.length, 'features');
    
    const results = features.map((feature, index) => {
      if (feature.geometry.type !== 'Polygon') {
        console.log(`🏢 Skipping non-polygon feature ${index}`);
        return null;
      }

      const coords = feature.geometry.coordinates[0];
      
      // Log first building for debugging
      if (index === 0) {
        console.log('🏢 First building coords sample:', coords.slice(0, 3));
      }
      
      // Get height from properties
      let height = 10; // default minimum
      if (feature.properties?.height) {
        height = parseFloat(feature.properties.height);
      } else if (feature.properties?.['building:levels']) {
        height = parseFloat(feature.properties['building:levels']) * 3.2;
      } else if (feature.properties?.levels) {
        height = parseFloat(feature.properties.levels) * 3.2;
      }

      // Convert coordinates to local space using projection
      const points = projection.polygonToVectors(coords.slice(0, -1));
      
      if (index === 0) {
        console.log('🏢 First building projected points sample:', points.slice(0, 3).map(p => ({ x: p.x.toFixed(2), y: p.y.toFixed(2) })));
      }
      
      if (points.length < 3) {
        console.log(`🏢 Skipping building ${index}: insufficient points`);
        return null;
      }

      const shape = new THREE.Shape(points);
      
      // Calculate centroid for positioning
      const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      
      if (index === 0) {
        console.log('🏢 First building:', { 
          centroid: [centroidX.toFixed(2), centroidY.toFixed(2)], 
          height: height.toFixed(2),
          pointCount: points.length
        });
      }
      
      return { 
        shape, 
        height, 
        key: `building-${index}`, 
        centroid: [centroidX, centroidY] as [number, number]
      };
    }).filter(Boolean);
    
    console.log('🏢 Created', results.length, 'valid building meshes');
    return results;
  }, [features, visible, projection]);

  if (!visible || meshes.length === 0) {
    console.log('🏢 Buildings: not rendering (visible:', visible, 'meshes:', meshes.length, ')');
    return null;
  }

  console.log('🏢 Rendering', meshes.length, 'building meshes');

  return (
    <group>
      {meshes.map((mesh) => mesh && (
        <mesh 
          key={mesh.key} 
          position={[mesh.centroid[0], mesh.height / 2, mesh.centroid[1]]}
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

function Roads({ features, visible, projection }: { features: any[]; visible: boolean; projection: CoordinateProjection }) {
  const lines = useMemo(() => {
    if (!visible || features.length === 0) {
      console.log('Roads: no features to render');
      return [];
    }
    
    console.log('Building road lines from', features.length, 'features');
    
    return features.map((feature, index) => {
      if (feature.geometry.type !== 'LineString') return null;

      const coords = feature.geometry.coordinates;
      const points = projection.lineToVectors(coords, 0.5);

      return { points, key: `road-${index}` };
    }).filter(Boolean);
  }, [features, visible, projection]);

  if (!visible || lines.length === 0) {
    console.log('Roads: not rendering (visible:', visible, 'lines:', lines.length, ')');
    return null;
  }

  console.log('Rendering', lines.length, 'road lines');

  return (
    <group>
      {lines.map((line) => {
        if (!line) return null;
        
        const geometry = new THREE.BufferGeometry().setFromPoints(line.points);
        const material = new THREE.LineBasicMaterial({ 
          color: '#444444',
          linewidth: 2
        });
        
        return (
          <primitive key={line.key} object={new THREE.Line(geometry, material)} />
        );
      })}
    </group>
  );
}

function Terrain({ features, visible, projection }: { features: any[]; visible: boolean; projection: CoordinateProjection }) {
  const points = useMemo(() => {
    if (!visible || features.length === 0) {
      console.log('🏔️ Terrain: no features to render');
      return [];
    }
    
    console.log('🏔️ Building terrain points from', features.length, 'features');
    
    const results = features.slice(0, 1000).map((feature, index) => {
      if (feature.geometry.type !== 'Point') return null;
      
      const [lng, lat, elevation = 0] = feature.geometry.coordinates;
      const pos = projection.pointToVector(lng, lat, elevation);
      
      if (index === 0) {
        console.log('🏔️ First terrain point:', {
          latLng: [lat.toFixed(6), lng.toFixed(6)],
          position: [pos.x.toFixed(2), pos.y.toFixed(2), pos.z.toFixed(2)],
          elevation: elevation.toFixed(2)
        });
      }
      
      return { 
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        elevation,
        key: `terrain-${index}`
      };
    }).filter(Boolean);
    
    console.log('🏔️ Created', results.length, 'terrain points');
    return results;
  }, [features, visible, projection]);

  if (!visible || points.length === 0) {
    console.log('🏔️ Terrain: not rendering (visible:', visible, 'points:', points.length, ')');
    return null;
  }

  console.log('🏔️ Rendering', points.length, 'terrain points');

  return (
    <group>
      {points.map((point) => point && (
        <mesh
          key={point.key}
          position={point.position}
        >
          <sphereGeometry args={[2, 8, 8]} />
          <meshStandardMaterial 
            color="#8fbc8f" 
            opacity={0.8} 
            transparent 
          />
        </mesh>
      ))}
    </group>
  );
}

function CameraController({ bounds }: { bounds: THREE.Box3 }) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (bounds.isEmpty()) {
      console.log('📷 Camera: bounds are empty, using defaults');
      return;
    }

    const center = new THREE.Vector3();
    bounds.getCenter(center);
    
    const size = new THREE.Vector3();
    bounds.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = Math.max(maxDim * 1.5, 100);
    
    camera.position.set(
      center.x + distance * 0.7,
      distance * 0.6,
      center.z + distance * 0.7
    );
    
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    
    console.log('📷 Camera positioned:', {
      center: center.toArray().map(v => v.toFixed(2)),
      size: size.toArray().map(v => v.toFixed(2)),
      maxDim: maxDim.toFixed(2),
      distance: distance.toFixed(2),
      position: camera.position.toArray().map(v => v.toFixed(2))
    });
  }, [bounds, camera]);
  
  return null;
}

export function Scene3D({ buildings, roads, terrain, layers, aoiBounds }: Scene3DProps) {
  const controlsRef = useRef<any>();

  // Calculate center point from aoiBounds
  const centerLat = aoiBounds ? (aoiBounds.minLat + aoiBounds.maxLat) / 2 : 0;
  const centerLng = aoiBounds ? (aoiBounds.minLng + aoiBounds.maxLng) / 2 : 0;

  console.log('🎬 Scene3D render:', {
    buildings: buildings.length,
    roads: roads.length,
    terrain: terrain.length,
    center: [centerLat.toFixed(6), centerLng.toFixed(6)],
    aoiBounds: aoiBounds ? {
      lat: [aoiBounds.minLat.toFixed(6), aoiBounds.maxLat.toFixed(6)],
      lng: [aoiBounds.minLng.toFixed(6), aoiBounds.maxLng.toFixed(6)]
    } : null,
    layersEnabled: layers
  });

  // Create coordinate projection
  const projection = useMemo(() => {
    console.log('🎬 Creating projection with center:', [centerLat, centerLng]);
    return new CoordinateProjection(centerLat, centerLng);
  }, [centerLat, centerLng]);

  // Calculate bounds for camera positioning
  const sceneBounds = useMemo(() => {
    const allFeatures = [
      ...(layers.buildings ? buildings : []),
      ...(layers.roads ? roads : []),
      ...(layers.terrain ? terrain.slice(0, 100) : []) // Only use subset for bounds
    ];
    
    if (allFeatures.length === 0) {
      console.log('⚠️ No features to calculate bounds');
      return new THREE.Box3(
        new THREE.Vector3(-100, -10, -100),
        new THREE.Vector3(100, 50, 100)
      );
    }
    
    console.log('📐 Calculating bounds from', allFeatures.length, 'features');
    const bounds = calculateBounds(allFeatures, projection);
    console.log('📐 Calculated bounds:', {
      min: bounds.min.toArray().map(v => v.toFixed(2)),
      max: bounds.max.toArray().map(v => v.toFixed(2)),
      isEmpty: bounds.isEmpty()
    });
    return bounds;
  }, [buildings, roads, terrain, layers, projection]);

  // Calculate camera distance based on bounds
  const cameraDistance = useMemo(() => {
    if (sceneBounds.isEmpty()) {
      console.log('📷 Using default camera distance (empty bounds)');
      return 500;
    }
    const size = new THREE.Vector3();
    sceneBounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = Math.max(maxDim * 1.5, 100);
    console.log('📷 Calculated camera distance:', distance.toFixed(2), 'from maxDim:', maxDim.toFixed(2));
    return distance;
  }, [sceneBounds]);

  return (
    <Canvas
      camera={{
        position: [cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7],
        fov: 50,
      }}
      shadows
    >
      <color attach="background" args={['#e8f4f8']} />
      
      <CameraController bounds={sceneBounds} />
      
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
        projection={projection}
      />
      <Roads 
        features={roads} 
        visible={layers.roads}
        projection={projection}
      />
      <Terrain 
        features={terrain} 
        visible={layers.terrain}
        projection={projection}
      />
      
      <Grid
        args={[10000, 10000]}
        cellSize={50}
        cellThickness={0.5}
        cellColor="#999999"
        sectionSize={200}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={3000}
        fadeStrength={1}
        followCamera={false}
      />
      
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={cameraDistance * 3}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
