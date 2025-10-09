import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Download, Loader2, Mountain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ElevationGrid {
  resolution: { nx: number; ny: number };
  bbox: { west: number; south: number; east: number; north: number };
  values: number[][];
  provider: string;
  accuracy: { verticalErrorM: number; nominalResolutionM: number };
}

interface ElevationSummary {
  min_m: number;
  max_m: number;
  mean_m: number;
  range_m?: number;
  slope_avg_deg: number;
  aspect_histogram: Array<{ dir: string; deg: number; pct: number }>;
  provider?: string;
  accuracy?: { verticalErrorM: number; nominalResolutionM: number };
  data_points?: number;
}

interface ElevationTabProps {
  siteId: string;
}

export function ElevationTab({ siteId }: ElevationTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [grid, setGrid] = useState<ElevationGrid | null>(null);
  const [summary, setSummary] = useState<ElevationSummary | null>(null);
  const [contours, setContours] = useState<any>(null);
  
  const [exaggeration, setExaggeration] = useState([1.5]);
  const [showSlope, setShowSlope] = useState(false);
  const [showAspect, setShowAspect] = useState(false);
  const [showContours, setShowContours] = useState(true);
  
  const [crossSection, setCrossSection] = useState<Array<{ distance: number; elevation: number }> | null>(null);
  const [drawingCrossSection, setDrawingCrossSection] = useState(false);

  useEffect(() => {
    loadElevationData();
  }, [siteId]);

  const loadElevationData = async () => {
    setLoading(true);
    try {
      console.log('🏔️ Loading high-resolution elevation data...');
      
      // Load grid with progress indication
      const gridPromise = supabase.functions.invoke('get-elevation-grid', {
        body: { site_id: siteId },
      });

      const { data: gridData, error: gridError } = await gridPromise;

      if (gridError) throw new Error(gridError.message || 'Failed to load elevation grid');
      if (!gridData) throw new Error('No elevation grid data returned');
      
      console.log('✅ Grid loaded:', gridData.resolution, '•', gridData.provider);
      setGrid(gridData);

      // Analyze in parallel
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-elevation', {
        body: {
          site_id: siteId,
          grid: gridData,
          contourInterval: 5,
        },
      });

      if (analysisError) throw new Error(analysisError.message || 'Failed to analyze elevation');
      if (!analysisData) throw new Error('No analysis data returned');
      
      console.log('✅ Analysis complete:', analysisData.summary);
      setSummary(analysisData.summary);
      setContours(analysisData.contours);

      // Save summary (non-blocking)
      supabase
        .from('site_requests')
        .update({ elevation_summary: analysisData.summary })
        .eq('id', siteId)
        .then(() => console.log('✅ Summary saved'));

      toast({
        title: 'Real terrain loaded',
        description: `${gridData.provider} • ${gridData.resolution.nx}×${gridData.resolution.ny} @ ${gridData.accuracy.nominalResolutionM}m`,
      });
    } catch (error: any) {
      console.error('❌ Elevation load failed:', error);
      toast({
        title: 'Failed to load terrain',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!contours) return;
    
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-elevation', {
        body: {
          site_id: siteId,
          contours,
          includePdf: true,
        },
      });

      if (error) throw error;

      toast({
        title: 'Export complete',
        description: 'DXF and PDF files generated',
      });

      // Open downloads
      if (data.dxf_url) window.open(data.dxf_url, '_blank');
      if (data.pdf_url) window.open(data.pdf_url, '_blank');
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const terrainData = useMemo(() => {
    if (!grid) return null;

    const { nx, ny } = grid.resolution;
    const { values } = grid;
    
    // Find actual min/max from data
    const validValues = values.flat().filter(v => v > 0);
    const dataMin = Math.min(...validValues);
    const dataMax = Math.max(...validValues);
    const dataRange = dataMax - dataMin;

    // Calculate slopes for better coloring
    const slopes: number[][] = Array(ny).fill(0).map(() => Array(nx).fill(0));
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const dzdx = (values[j][i + 1] - values[j][i - 1]) / 2;
        const dzdy = (values[j + 1][i] - values[j - 1][i]) / 2;
        slopes[j][i] = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
      }
    }
    
    const maxSlope = Math.max(...slopes.flat());

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    // Create mesh with proper scaling
    const xScale = 100 / (nx - 1);
    const zScale = 100 / (ny - 1);

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const elevation = values[j][i] || 0;
        const x = i * xScale - 50;
        const z = j * zScale - 50;
        const y = (elevation - dataMin) * exaggeration[0]; // Normalize to start at 0
        
        vertices.push(x, y, z);

        // Advanced color mapping with slope influence
        const normalized = dataRange > 0 ? (elevation - dataMin) / dataRange : 0;
        const slope = slopes[j]?.[i] || 0;
        const slopeNorm = maxSlope > 0 ? slope / maxSlope : 0;
        
        const color = new THREE.Color();
        
        // Terrain-realistic colors with slope darkening
        if (normalized < 0.2) {
          // Low: dark green
          color.setHSL(0.28, 0.6 - slopeNorm * 0.2, 0.25 + normalized * 0.15);
        } else if (normalized < 0.4) {
          // Mid-low: green to yellow-green
          color.setHSL(0.25 - (normalized - 0.2) * 0.15, 0.7 - slopeNorm * 0.3, 0.35 + normalized * 0.1);
        } else if (normalized < 0.6) {
          // Mid: yellow-brown
          color.setHSL(0.12 - (normalized - 0.4) * 0.05, 0.5 - slopeNorm * 0.2, 0.4 + normalized * 0.05);
        } else if (normalized < 0.8) {
          // High: brown
          const t = (normalized - 0.6) / 0.2;
          color.setRGB(
            0.45 + t * 0.15 - slopeNorm * 0.15,
            0.35 + t * 0.1 - slopeNorm * 0.15,
            0.25 + t * 0.05 - slopeNorm * 0.15
          );
        } else {
          // Very high: gray-white (rock/snow)
          const t = (normalized - 0.8) / 0.2;
          color.setRGB(
            0.6 + t * 0.3,
            0.6 + t * 0.3,
            0.65 + t * 0.3
          );
        }
        
        colors.push(color.r, color.g, color.b);
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

    return { geometry, dataMin, dataMax, dataRange };
  }, [grid, exaggeration]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!grid) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Mountain className="w-16 h-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Real Terrain Elevation Data</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Load accurate elevation data from trusted sources (USGS 3DEP for US, SRTM30m globally).
            View 3D terrain, analyze slopes, generate contours, and export to CAD formats.
          </p>
        </div>
        <Button onClick={loadElevationData} size="lg">
          <Mountain className="w-4 h-4 mr-2" />
          Load Elevation Data
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Data Provider Badge */}
      {grid.provider && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-primary">Real Terrain Data ✓</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{grid.provider}</span>
              {grid.accuracy && (
                <>
                  {' • '}
                  {grid.accuracy.nominalResolutionM}m resolution
                  {' • '}
                  ±{grid.accuracy.verticalErrorM}m vertical accuracy
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <Label>Terrain Exaggeration: {exaggeration[0]}×</Label>
          <Slider
            value={exaggeration}
            onValueChange={setExaggeration}
            min={1}
            max={3}
            step={0.1}
            className="mt-2"
          />
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label>Show Slope</Label>
            <Switch checked={showSlope} onCheckedChange={setShowSlope} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Aspect</Label>
            <Switch checked={showAspect} onCheckedChange={setShowAspect} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Contours</Label>
            <Switch checked={showContours} onCheckedChange={setShowContours} />
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <Button onClick={handleExport} disabled={exporting} className="w-full">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="ml-2">Export DXF + PDF</span>
          </Button>
        </Card>
      </div>

      {/* 3D View */}
      <Card className="h-[600px] relative overflow-hidden">
        <div className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold">High-Res Terrain</span>
          </div>
          <div className="text-muted-foreground">
            {grid.resolution.nx}×{grid.resolution.ny} DEM grid
          </div>
          <div className="text-muted-foreground">
            {(grid.resolution.nx * grid.resolution.ny).toLocaleString()} data points
          </div>
          {terrainData && (
            <div className="text-muted-foreground pt-1 border-t border-border/50">
              Relief: {terrainData.dataRange.toFixed(1)}m
            </div>
          )}
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
          
          {/* Enhanced lighting for realistic terrain */}
          <ambientLight intensity={0.3} />
          <directionalLight 
            position={[50, 80, 30]} 
            intensity={1.5}
            castShadow
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-far={300}
            shadow-camera-left={-100}
            shadow-camera-right={100}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-30, 40, -30]} intensity={0.4} color="#b8d4ff" />
          <hemisphereLight args={['#87ceeb', '#8b7355', 0.4]} />
          
          {/* Terrain Mesh with enhanced materials */}
          {terrainData?.geometry && (
            <mesh geometry={terrainData.geometry} castShadow receiveShadow>
              <meshStandardMaterial 
                vertexColors 
                roughness={0.95}
                metalness={0.05}
                flatShading={false}
                side={THREE.FrontSide}
              />
            </mesh>
          )}
          
          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
            <planeGeometry args={[300, 300]} />
            <shadowMaterial opacity={0.15} />
          </mesh>
          
          {/* Subtle fog for depth */}
          <fog attach="fog" args={['#f0f0f0', 100, 300]} />
        </Canvas>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Min Elevation</p>
            <p className="text-2xl font-bold">{summary.min_m.toFixed(1)}m</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Max Elevation</p>
            <p className="text-2xl font-bold">{summary.max_m.toFixed(1)}m</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Mean Elevation</p>
            <p className="text-2xl font-bold">{summary.mean_m.toFixed(1)}m</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Relief</p>
            <p className="text-2xl font-bold">{summary.range_m?.toFixed(1) || (summary.max_m - summary.min_m).toFixed(1)}m</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Avg Slope</p>
            <p className="text-2xl font-bold">{summary.slope_avg_deg.toFixed(1)}°</p>
          </Card>
        </div>
      )}

      {/* Cross Section */}
      {crossSection && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Elevation Profile</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={crossSection}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="distance" label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="elevation" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
