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
  slope_avg_deg: number;
  aspect_histogram: Array<{ dir: string; deg: number; pct: number }>;
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
      console.log('🏔️ Loading elevation data for site:', siteId);
      
      // Load grid
      const { data: gridData, error: gridError } = await supabase.functions.invoke('get-elevation-grid', {
        body: { site_id: siteId },
      });

      if (gridError) {
        console.error('Grid error:', gridError);
        throw new Error(gridError.message || 'Failed to load elevation grid');
      }
      
      if (!gridData) {
        throw new Error('No elevation grid data returned');
      }
      
      console.log('✅ Grid loaded:', gridData.resolution);
      setGrid(gridData);

      // Analyze
      console.log('📊 Analyzing elevation...');
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-elevation', {
        body: {
          site_id: siteId,
          grid: gridData,
          contourInterval: 5,
        },
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        throw new Error(analysisError.message || 'Failed to analyze elevation');
      }
      
      if (!analysisData) {
        throw new Error('No analysis data returned');
      }
      
      console.log('✅ Analysis complete');
      setSummary(analysisData.summary);
      setContours(analysisData.contours);

      // Save summary
      await supabase
        .from('site_requests')
        .update({ elevation_summary: analysisData.summary })
        .eq('id', siteId);

      toast({
        title: 'Elevation data loaded',
        description: `Real ${gridData.provider} data • ${gridData.resolution.nx}×${gridData.resolution.ny} grid`,
      });
    } catch (error: any) {
      console.error('Failed to load elevation:', error);
      toast({
        title: 'Error loading elevation',
        description: error.message || 'Unknown error',
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

  const terrainGeometry = useMemo(() => {
    if (!grid) return null;

    const { nx, ny } = grid.resolution;
    const { values } = grid;
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    // Create mesh
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const elevation = values[j][i];
        vertices.push(i, elevation * exaggeration[0], j);

        // Color by elevation
        const normalized = (elevation - (summary?.min_m ?? 0)) / ((summary?.max_m ?? 100) - (summary?.min_m ?? 0));
        const color = new THREE.Color();
        color.setHSL(0.6 - normalized * 0.4, 0.8, 0.5);
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

    return geometry;
  }, [grid, exaggeration, summary]);

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
        <p className="text-muted-foreground">No elevation data available</p>
        <Button onClick={loadElevationData}>Load Elevation Data</Button>
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
      <Card className="h-96">
        <Canvas>
          <PerspectiveCamera makeDefault position={[50, 50, 50]} />
          <OrbitControls />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          {terrainGeometry && (
            <mesh geometry={terrainGeometry}>
              <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
            </mesh>
          )}
        </Canvas>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
