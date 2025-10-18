import { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Site3DViewerProps {
  siteId: string;
  siteName: string;
}

interface ModelData {
  buildings: Array<{
    footprint: number[][];
    height: number;
    name?: string;
  }>;
  roads: Array<{
    points: number[][];
    type: string;
  }>;
  water: Array<{
    points: number[][];
  }>;
  terrain: Array<{
    lat: number;
    lng: number;
    elevation: number;
  }>;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  center: {
    lat: number;
    lng: number;
  };
}

function latLngToLocal(lat: number, lng: number, center: { lat: number; lng: number }) {
  const metersPerDegree = 111320;
  const x = (lng - center.lng) * metersPerDegree * Math.cos(center.lat * Math.PI / 180);
  const y = (lat - center.lat) * metersPerDegree;
  return { x, y };
}

function Buildings({ buildings, center }: { buildings: ModelData['buildings']; center: ModelData['center'] }) {
  if (!buildings || !Array.isArray(buildings)) return null;
  
  return (
    <group>
      {buildings.map((building, idx) => {
        if (!building?.footprint || building.footprint.length < 3) return null;

        // Convert lat/lng to local coordinates
        const localPoints = building.footprint.map(([lng, lat]) => {
          const { x, y } = latLngToLocal(lat, lng, center);
          return new THREE.Vector2(x, y);
        });

        // Create shape for extrusion
        const shape = new THREE.Shape(localPoints);
        const extrudeSettings = {
          depth: building.height,
          bevelEnabled: false
        };

        return (
          <mesh key={idx} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            <meshStandardMaterial 
              color="#e0e0e0" 
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Terrain({ terrain, center }: { terrain: ModelData['terrain']; center: ModelData['center'] }) {
  if (!terrain || !Array.isArray(terrain) || terrain.length === 0) return null;
  
  const geometry = new THREE.BufferGeometry();
  
  const gridSize = Math.sqrt(terrain.length);
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // Create vertices
  terrain.forEach(point => {
    const { x, y } = latLngToLocal(point.lat, point.lng, center);
    vertices.push(x, point.elevation, y);
  });

  // Create faces
  for (let i = 0; i < gridSize - 1; i++) {
    for (let j = 0; j < gridSize - 1; j++) {
      const a = i * gridSize + j;
      const b = i * gridSize + j + 1;
      const c = (i + 1) * gridSize + j;
      const d = (i + 1) * gridSize + j + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color="#8b7355"
        roughness={0.9}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Roads({ roads, center }: { roads: ModelData['roads']; center: ModelData['center'] }) {
  if (!roads || !Array.isArray(roads)) return null;
  
  return (
    <group>
      {roads.map((road, idx) => {
        if (!road?.points || road.points.length < 2) return null;

        const points = road.points.map(([lng, lat]) => {
          const { x, y } = latLngToLocal(lat, lng, center);
          return new THREE.Vector3(x, 0.1, y);
        });

        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.5, 8, false);

        return (
          <mesh key={idx} geometry={tubeGeometry}>
            <meshStandardMaterial 
              color="#555555"
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene({ modelData }: { modelData: ModelData }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[100, 100, 50]} 
        intensity={1}
        castShadow
      />
      <hemisphereLight intensity={0.3} groundColor="#444444" />
      
      {modelData.terrain && <Terrain terrain={modelData.terrain} center={modelData.center} />}
      {modelData.buildings && <Buildings buildings={modelData.buildings} center={modelData.center} />}
      {modelData.roads && <Roads roads={modelData.roads} center={modelData.center} />}
      
      <Grid 
        args={[1000, 1000]} 
        cellSize={10} 
        cellThickness={0.5} 
        cellColor="#999999"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={500}
        fadeStrength={1}
        position={[0, -0.5, 0]}
      />
      
      <OrbitControls 
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={1000}
        maxPolarAngle={Math.PI / 2}
      />
      
      <Environment preset="city" />
    </>
  );
}

export default function Site3DViewer({ siteId, siteName }: Site3DViewerProps) {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModelData();
  }, [siteId]);

  const loadModelData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('get-3d-model-data', {
        body: { siteId }
      });

      if (functionError) throw functionError;
      if (!data) throw new Error('No data received');

      setModelData(data);
    } catch (err) {
      console.error('Error loading 3D model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load 3D model');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Loading 3D model for {siteName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-lg text-destructive">Error loading 3D model</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={loadModelData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!modelData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">No model data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [100, 100, 100], fov: 50 }}
        shadows
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <Scene modelData={modelData} />
        </Suspense>
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <h3 className="font-semibold text-sm mb-2">{siteName}</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Buildings: {modelData.buildings?.length || 0}</p>
          <p>Roads: {modelData.roads?.length || 0}</p>
          <p>Terrain Points: {modelData.terrain?.length || 0}</p>
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <p className="font-medium mb-1">Controls:</p>
          <p>• Left drag: Rotate</p>
          <p>• Right drag: Pan</p>
          <p>• Scroll: Zoom</p>
        </div>
      </div>
    </div>
  );
}
