import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Sun } from 'lucide-react';

interface Terrain3DViewerProps {
  elevationGrid: any;
  shadowVisualization?: THREE.BufferGeometry | null;
  buildings?: any[];
  currentSunPos?: { altitude: number; azimuth: number } | null;
  shadowResult?: any;
  analysisMode?: 'instant' | 'daily';
  height?: string;
  showSunInfo?: boolean;
}

export function Terrain3DViewer({
  elevationGrid,
  shadowVisualization,
  buildings = [],
  currentSunPos,
  shadowResult,
  analysisMode = 'instant',
  height = 'h-[600px]',
  showSunInfo = false,
}: Terrain3DViewerProps) {
  // Convert elevation grid to THREE.js geometry
  const terrainGeometry = useMemo(() => {
    if (!elevationGrid) return null;

    const { nx, ny } = elevationGrid.resolution;
    const { values } = elevationGrid;
    
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const xScale = 100 / (nx - 1);
    const zScale = 100 / (ny - 1);

    // Find min/max elevation for color mapping
    let minElev = Infinity;
    let maxElev = -Infinity;
    values.forEach((row: number[]) => {
      row.forEach((val: number) => {
        if (val < minElev) minElev = val;
        if (val > maxElev) maxElev = val;
      });
    });

    // Create vertices with colors
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const elevation = values[j][i] || 0;
        const x = i * xScale - 50;
        const z = j * zScale - 50;
        const y = elevation;
        
        vertices.push(x, y, z);

        // Color based on elevation (brown to tan to light)
        const t = (elevation - minElev) / (maxElev - minElev || 1);
        const r = 0.55 + t * 0.25; // 0.55 to 0.8
        const g = 0.45 + t * 0.25; // 0.45 to 0.7
        const b = 0.33 + t * 0.27; // 0.33 to 0.6
        colors.push(r, g, b);
      }
    }

    // Create triangles
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i;
        const b = j * nx + (i + 1);
        const c = (j + 1) * nx + i;
        const d = (j + 1) * nx + (i + 1);

        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    return geometry;
  }, [elevationGrid]);

  if (!terrainGeometry) return null;

  return (
    <Card className={`${height} relative overflow-hidden`}>
      {showSunInfo && currentSunPos && (
        <div className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5 shadow-lg">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold">Sun Position</span>
          </div>
          <div className="text-muted-foreground">
            Altitude: {currentSunPos.altitude.toFixed(1)}°
          </div>
          <div className="text-muted-foreground">
            Azimuth: {currentSunPos.azimuth.toFixed(1)}°
          </div>
          {shadowResult && (
            <div className="text-muted-foreground pt-1 border-t border-border/50">
              {analysisMode === 'instant' 
                ? `${shadowResult.percentShaded.toFixed(1)}% shaded`
                : `${(shadowResult.cells.reduce((s: number, c: any) => s + (c.sunHours || 0), 0) / shadowResult.cells.length).toFixed(1)}h avg sun`
              }
            </div>
          )}
        </div>
      )}

      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="text-xs bg-background/90 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
          3D Terrain View
        </Badge>
      </div>
      
      <Canvas shadows camera={{ position: [70, 60, 70], fov: 50 }}>
        <PerspectiveCamera makeDefault position={[70, 60, 70]} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.08}
          minDistance={30}
          maxDistance={250}
          maxPolarAngle={Math.PI / 2.1}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[50, 80, 30]} 
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Terrain */}
        <mesh geometry={terrainGeometry} castShadow receiveShadow>
          <meshStandardMaterial 
            vertexColors
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
        
        {/* Shadow overlay (optional) */}
        {shadowVisualization && (
          <mesh geometry={shadowVisualization} position={[0, 0.5, 0]}>
            <meshBasicMaterial 
              vertexColors
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
        
        {/* Buildings (future enhancement) */}
        {buildings.length > 0 && buildings.map((building, idx) => (
          <mesh key={idx} position={[building.x || 0, building.height / 2 || 5, building.y || 0]} castShadow>
            <boxGeometry args={[building.width || 10, building.height || 10, building.depth || 10]} />
            <meshStandardMaterial color="#cccccc" roughness={0.7} />
          </mesh>
        ))}
        
        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[300, 300]} />
          <shadowMaterial opacity={0.15} />
        </mesh>
        
        <fog attach="fog" args={['hsl(var(--background))', 100, 300]} />
      </Canvas>
    </Card>
  );
}
