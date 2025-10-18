import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2 } from 'lucide-react';
import { CoordinateProjection } from '@/lib/coordinateUtils';
import { triangulateTerrain } from '@/lib/terrainTriangulation';
import JSZip from 'jszip';

interface Site3DViewProps {
  siteId: string;
}

export function Site3DView({ siteId }: Site3DViewProps) {
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [roads, setRoads] = useState<any[]>([]);
  const [terrain, setTerrain] = useState<any>(null);
  const [siteData, setSiteData] = useState<any>(null);
  const [projection, setProjection] = useState<CoordinateProjection | null>(null);

  useEffect(() => {
    loadSiteData();
  }, [siteId]);

  const loadSiteData = async () => {
    setLoading(true);
    try {
      // Load site request data
      const { data: site, error: siteError } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', siteId)
        .single();

      if (siteError) throw siteError;
      setSiteData(site);

      // Initialize projection
      const proj = new CoordinateProjection(site.center_lat, site.center_lng);
      setProjection(proj);

      // Load site pack ZIP if available
      if (site.file_url) {
        const response = await fetch(site.file_url);
        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);

        // Extract buildings
        if (zip.files['geojson/buildings.geojson']) {
          const buildingsJson = await zip.files['geojson/buildings.geojson'].async('string');
          const buildingsData = JSON.parse(buildingsJson);
          setBuildings(buildingsData.features || []);
        }

        // Extract roads
        if (zip.files['geojson/roads.geojson']) {
          const roadsJson = await zip.files['geojson/roads.geojson'].async('string');
          const roadsData = JSON.parse(roadsJson);
          setRoads(roadsData.features || []);
        }

        // Extract terrain
        if (zip.files['geojson/terrain.geojson']) {
          const terrainJson = await zip.files['geojson/terrain.geojson'].async('string');
          const terrainData = JSON.parse(terrainJson);
          
          // Triangulate terrain for 3D mesh
          const terrainGeometry = triangulateTerrain(terrainData.features, proj);
          setTerrain(terrainGeometry);
        }
      }

      console.log('✅ 3D site data loaded');
    } catch (error) {
      console.error('Failed to load 3D site data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert building GeoJSON to 3D meshes
  const buildingMeshes = useMemo(() => {
    if (!buildings.length || !projection) return [];

    return buildings.map((feature, idx) => {
      const coords = feature.geometry.coordinates[0];
      const height = feature.properties?.height || 10;
      
      // Convert coordinates to local XY
      const points = coords.map((coord: number[]) => {
        const { x, y } = projection.latLngToXY(coord[1], coord[0]);
        return new THREE.Vector2(x, y);
      });

      // Create extruded building shape
      const shape = new THREE.Shape(points);
      const extrudeSettings = {
        depth: height,
        bevelEnabled: false,
      };

      return { shape, extrudeSettings, key: idx };
    });
  }, [buildings, projection]);

  // Convert roads to 3D lines
  const roadLines = useMemo(() => {
    if (!roads.length || !projection) return [];

    return roads.map((feature, idx) => {
      const coords = feature.geometry.coordinates;
      const points = coords.map((coord: number[]) => {
        const { x, y } = projection.latLngToXY(coord[1], coord[0]);
        return new THREE.Vector3(x, 0.2, y); // Slightly above ground
      });

      return { points, key: idx };
    });
  }, [roads, projection]);

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading 3D site view...</p>
        </div>
      </Card>
    );
  }

  if (!buildings.length && !terrain) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No 3D data available for this site</p>
          <p className="text-sm text-muted-foreground">Generate a new site pack to view 3D data</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full relative overflow-hidden">
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="text-xs bg-background/90 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
          3D Site View
        </Badge>
      </div>

      <div className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1">
        <div className="font-semibold">Site Data</div>
        <div className="text-muted-foreground">{buildings.length} buildings</div>
        <div className="text-muted-foreground">{roads.length} roads</div>
        {terrain && <div className="text-muted-foreground">Terrain mesh</div>}
      </div>

      <Canvas shadows camera={{ position: [100, 80, 100], fov: 50 }}>
        <PerspectiveCamera makeDefault position={[100, 80, 100]} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.08}
          minDistance={30}
          maxDistance={300}
          maxPolarAngle={Math.PI / 2.1}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[50, 100, 30]} 
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Terrain */}
        {terrain && (
          <mesh geometry={terrain} receiveShadow>
            <meshStandardMaterial 
              color="#8b7355"
              roughness={0.95}
              metalness={0.05}
            />
          </mesh>
        )}

        {/* Buildings */}
        {buildingMeshes.map(({ shape, extrudeSettings, key }) => (
          <mesh key={`building-${key}`} castShadow receiveShadow>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            <meshStandardMaterial 
              color="#cccccc"
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        ))}

        {/* Roads */}
        {roadLines.map(({ points, key }) => (
          <line key={`road-${key}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={points.length}
                array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#666666" linewidth={2} />
          </line>
        ))}
        
        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[500, 500]} />
          <shadowMaterial opacity={0.15} />
        </mesh>
        
        <fog attach="fog" args={['hsl(var(--background))', 150, 350]} />
      </Canvas>
    </Card>
  );
}
