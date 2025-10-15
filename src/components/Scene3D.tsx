import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { CoordinateProjection, calculateBounds } from '@/lib/coordinateUtils';
import { BoundaryOutline } from './BoundaryOutline';
import { TerrainMesh } from './TerrainMesh';

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
  const buildingData = useMemo(() => {
    if (!visible || features.length === 0) {
      console.log('🏢 Buildings: no features to render');
      return { meshes: [], bounds: new THREE.Box3() };
    }
    
    console.log('🏢 Building meshes from', features.length, 'features');
    
    const groupBounds = new THREE.Box3();
    const meshes = features.map((feature, index) => {
      if (feature.geometry.type !== 'Polygon') {
        return null;
      }

      const coords = feature.geometry.coordinates[0];
      
      if (index === 0) {
        console.log('🏢 First building raw coords:', coords.slice(0, 3).map(c => 
          `[${c[0].toFixed(6)}, ${c[1].toFixed(6)}]`
        ));
      }
      
      // Get height from properties
      let height = 10;
      if (feature.properties?.height) {
        height = parseFloat(feature.properties.height);
      } else if (feature.properties?.['building:levels']) {
        height = parseFloat(feature.properties['building:levels']) * 3.5;
      } else if (feature.properties?.levels) {
        height = parseFloat(feature.properties.levels) * 3.5;
      }

      // Convert coordinates to local space
      const points = projection.polygonToVectors(coords.slice(0, -1));
      
      if (index === 0) {
        console.log('🏢 First building projected points:', points.slice(0, 3).map(p => 
          `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`
        ));
      }
      
      if (points.length < 3) {
        return null;
      }

      // Create shape and geometry
      const shape = new THREE.Shape(points);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false,
      });

      // Update bounds
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        groupBounds.union(geometry.boundingBox);
      }
      
      if (index === 0) {
        console.log('🏢 First building details:', {
          height: height.toFixed(2),
          points: points.length,
          bounds: geometry.boundingBox ? {
            min: geometry.boundingBox.min.toArray().map(v => v.toFixed(2)),
            max: geometry.boundingBox.max.toArray().map(v => v.toFixed(2))
          } : null
        });
      }
      
      return { 
        geometry,
        height, 
        key: `building-${index}`
      };
    }).filter(Boolean);
    
    console.log('🏢 Created', meshes.length, 'building meshes. Group bounds:', {
      min: groupBounds.min.toArray().map(v => v.toFixed(2)),
      max: groupBounds.max.toArray().map(v => v.toFixed(2)),
      isEmpty: groupBounds.isEmpty()
    });
    
    return { meshes, bounds: groupBounds };
  }, [features, visible, projection]);

  if (!visible || buildingData.meshes.length === 0) {
    return null;
  }

  return (
    <group>
      {buildingData.meshes.map((mesh) => mesh && (
        <mesh 
          key={mesh.key} 
          geometry={mesh.geometry}
          position={[0, mesh.height / 2, 0]}
          castShadow
          receiveShadow
        >
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

// Terrain component removed - now using TerrainMesh

function CameraController({ sceneGroup }: { sceneGroup: React.RefObject<THREE.Group> }) {
  const { camera, controls } = useThree();
  
  useEffect(() => {
    // Add a small delay to ensure geometry is fully loaded
    const timeoutId = setTimeout(() => {
      if (!sceneGroup.current) {
        console.log('📷 Camera: waiting for scene group');
        camera.position.set(200, 150, 200);
        camera.lookAt(0, 0, 0);
        return;
      }

      // Calculate bounds from actual rendered scene group
      const bounds = new THREE.Box3().setFromObject(sceneGroup.current);
      
      if (bounds.isEmpty()) {
        console.log('📷 Camera: bounds empty, using fallback position');
        camera.position.set(200, 150, 200);
        camera.lookAt(0, 0, 0);
        
        // Update controls target if available
        if (controls && 'target' in controls) {
          (controls as any).target.set(0, 0, 0);
          (controls as any).update();
        }
        return;
      }

      const center = new THREE.Vector3();
      bounds.getCenter(center);
      
      const size = new THREE.Vector3();
      bounds.getSize(size);
      
      // Ensure minimum dimensions for better framing
      const maxDim = Math.max(size.x, size.y, size.z, 50);
      const distance = Math.max(maxDim * 1.8, 150);
      
      // Position camera at an angle with better perspective
      camera.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7
      );
      
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      
      // Update controls target if available
      if (controls && 'target' in controls) {
        (controls as any).target.copy(center);
        (controls as any).update();
      }
      
      console.log('📷 Camera setup from scene bounds:', {
        center: center.toArray().map(v => v.toFixed(2)),
        size: size.toArray().map(v => v.toFixed(2)),
        maxDim: maxDim.toFixed(2),
        distance: distance.toFixed(2),
        cameraPos: camera.position.toArray().map(v => v.toFixed(2))
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [sceneGroup, camera, controls]);
  
  return null;
}

export function Scene3D({ buildings, roads, terrain, layers, aoiBounds }: Scene3DProps) {
  const controlsRef = useRef<any>();
  const sceneGroupRef = useRef<THREE.Group>(null);

  // Calculate center point from aoiBounds
  const centerLat = aoiBounds ? (aoiBounds.minLat + aoiBounds.maxLat) / 2 : 0;
  const centerLng = aoiBounds ? (aoiBounds.minLng + aoiBounds.maxLng) / 2 : 0;

  console.log('🎬 Scene3D initialization:', {
    dataLoaded: {
      buildings: buildings.length,
      roads: roads.length,
      terrain: terrain.length
    },
    aoiBounds: aoiBounds ? {
      center: `(${centerLat.toFixed(6)}, ${centerLng.toFixed(6)})`,
      latRange: `[${aoiBounds.minLat.toFixed(6)}, ${aoiBounds.maxLat.toFixed(6)}]`,
      lngRange: `[${aoiBounds.minLng.toFixed(6)}, ${aoiBounds.maxLng.toFixed(6)}]`
    } : 'NO BOUNDS',
    layersEnabled: layers
  });

  // Validate data
  if (buildings.length > 0 && buildings[0]) {
    console.log('📊 First building feature:', {
      type: buildings[0].geometry?.type,
      coordCount: buildings[0].geometry?.coordinates?.[0]?.length,
      properties: Object.keys(buildings[0].properties || {})
    });
  }

  // Create coordinate projection using Web Mercator centered on AOI
  const projection = useMemo(() => {
    console.log('🗺️ Creating projection centered at:', { centerLat, centerLng });
    return new CoordinateProjection(centerLat, centerLng);
  }, [centerLat, centerLng]);

  return (
    <Canvas
      camera={{
        position: [300, 200, 300],
        fov: 50,
      }}
      shadows
    >
      <color attach="background" args={['#e8f4f8']} />
      
      <CameraController sceneGroup={sceneGroupRef} />
      
      {/* Debug: Axis helper at origin */}
      <axesHelper args={[100]} />
      
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#c8d6b9" roughness={0.9} />
      </mesh>
      
      {/* Scene content group */}
      <group ref={sceneGroupRef}>
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
        <TerrainMesh
          features={terrain} 
          visible={layers.terrain}
          projection={projection}
        />
        
        {/* Boundary outline */}
        {aoiBounds && (
          <BoundaryOutline bounds={aoiBounds} projection={projection} />
        )}
      </group>
      
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
        maxDistance={2000}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
