import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Sun, Moon, Clock, Download, Loader2, Calendar,
  Sunrise, Sunset, CloudSun
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SolarValidationReport } from '@/components/SolarValidationReport';
import { 
  getSunPosition, 
  getSunPath, 
  getPresetDate, 
  getSolarTimes,
  type SunPosition 
} from '@/lib/solarMath';
import { 
  computeInstantShadows, 
  computeSunHours,
  type ShadowAnalysisResult 
} from '@/lib/shadowEngine';

interface SolarAnalyzerTabProps {
  siteId: string;
  centerLat: number;
  centerLng: number;
}

export function SolarAnalyzerTab({ siteId, centerLat, centerLng }: SolarAnalyzerTabProps) {
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'instant' | 'daily'>('instant');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<number>(12 * 60); // minutes since midnight
  const [resolution, setResolution] = useState<1 | 2 | 5>(2);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  
  // Elevation data (reused from elevation tab)
  const [elevationGrid, setElevationGrid] = useState<any>(null);
  const [loadingElevation, setLoadingElevation] = useState(false);
  
  // Building data from site pack
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [buildingValidation, setBuildingValidation] = useState<any>(null);
  
  // Analysis results
  const [currentSunPos, setCurrentSunPos] = useState<SunPosition | null>(null);
  const [shadowResult, setShadowResult] = useState<ShadowAnalysisResult | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);

  // Load elevation data on mount
  useEffect(() => {
    loadElevationData();
  }, [siteId]);
  
  // Load building data from site pack
  useEffect(() => {
    loadBuildingData();
  }, [siteId]);

  // Update sun position when time/date changes
  useEffect(() => {
    const dateTime = new Date(selectedDate);
    const hours = Math.floor(selectedTime / 60);
    const minutes = selectedTime % 60;
    dateTime.setHours(hours, minutes, 0, 0);
    
    const pos = getSunPosition(centerLat, centerLng, dateTime);
    setCurrentSunPos(pos);
  }, [selectedDate, selectedTime, centerLat, centerLng]);

  const loadBuildingData = async () => {
    setLoadingBuildings(true);
    try {
      console.log('🏢 Loading building data from site pack...');
      
      // Get site request to access file URL
      const { data: siteRequest, error: siteError } = await supabase
        .from('site_requests')
        .select('file_url, include_buildings')
        .eq('id', siteId)
        .maybeSingle();

      if (siteError || !siteRequest) {
        console.warn('Site request not found');
        return;
      }
      
      if (!siteRequest.include_buildings || !siteRequest.file_url) {
        console.log('No building data included in site pack');
        return;
      }
      
      // Download and extract buildings from ZIP
      const JSZip = (await import('jszip')).default;
      const response = await fetch(siteRequest.file_url);
      const blob = await response.blob();
      const zip = await JSZip.loadAsync(blob);
      
      if (zip.files['geojson/buildings.geojson']) {
        const buildingsJson = await zip.files['geojson/buildings.geojson'].async('string');
        const buildingsData = JSON.parse(buildingsJson);
        const buildingFeatures = buildingsData.features || [];
        
        console.log(`✅ Loaded ${buildingFeatures.length} buildings from site pack`);
        
        // Extract and validate building massing
        const { extractBuildingMassing, validateBuildingData } = await import('@/lib/buildingIntegration');
        const buildingMassing = extractBuildingMassing(buildingFeatures, centerLat, centerLng);
        const validation = validateBuildingData(buildingMassing);
        
        setBuildings(buildingMassing);
        setBuildingValidation(validation);
        
        console.log('🏢 Building validation:', validation);
        
        if (validation.warnings.length > 0) {
          toast({
            title: 'Building data loaded',
            description: `${buildingMassing.length} buildings • ${validation.warnings.length} warnings`,
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to load buildings:', error);
    } finally {
      setLoadingBuildings(false);
    }
  };
  
  const loadElevationData = async () => {
    setLoadingElevation(true);
    try {
      const { data: gridData, error } = await supabase.functions.invoke('get-elevation-grid', {
        body: { site_id: siteId },
      });

      if (error) throw error;
      if (!gridData) throw new Error('No elevation data');
      
      setElevationGrid(gridData);
      console.log('✅ Elevation grid loaded for solar analysis');
    } catch (error: any) {
      console.error('Failed to load elevation:', error);
      toast({
        title: 'Elevation data required',
        description: 'Please load elevation data first from the Elevation tab',
        variant: 'destructive',
      });
    } finally {
      setLoadingElevation(false);
    }
  };

  // Convert elevation grid to THREE.js geometry for shadow casting
  const terrainGeometry = useMemo(() => {
    if (!elevationGrid) return null;

    const { nx, ny } = elevationGrid.resolution;
    const { values } = elevationGrid;
    
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    const xScale = 100 / (nx - 1);
    const zScale = 100 / (ny - 1);

    // Create vertices
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const elevation = values[j][i] || 0;
        const x = i * xScale - 50;
        const z = j * zScale - 50;
        const y = elevation; // Use actual elevation, no normalization
        
        vertices.push(x, y, z);
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
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [elevationGrid]);

  // Calculate REAL bounds from elevation grid
  const bounds = useMemo(() => {
    if (!elevationGrid) return { minX: -50, maxX: 50, minY: -50, maxY: 50 };
    
    const { bbox } = elevationGrid;
    const { nx, ny } = elevationGrid.resolution;
    
    // Convert geographic bounds to local meters (approximate)
    // Use center of bbox as origin
    const centerLat = (bbox.north + bbox.south) / 2;
    const centerLng = (bbox.west + bbox.east) / 2;
    
    // Meters per degree at this latitude
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos(centerLat * Math.PI / 180);
    
    const minX = (bbox.west - centerLng) * metersPerDegreeLng;
    const maxX = (bbox.east - centerLng) * metersPerDegreeLng;
    const minY = (bbox.south - centerLat) * metersPerDegreeLat;
    const maxY = (bbox.north - centerLat) * metersPerDegreeLat;
    
    console.log('📐 Calculated bounds from elevation grid:', {
      bbox,
      localBounds: { minX: minX.toFixed(1), maxX: maxX.toFixed(1), minY: minY.toFixed(1), maxY: maxY.toFixed(1) },
      sizeMeters: {
        width: (maxX - minX).toFixed(1),
        height: (maxY - minY).toFixed(1)
      }
    });
    
    return { minX, maxX, minY, maxY };
  }, [elevationGrid]);

  const handlePresetDate = (preset: 'summer' | 'winter' | 'spring' | 'fall') => {
    const date = getPresetDate(preset);
    setSelectedDate(date);
    toast({
      title: `Date set to ${preset}`,
      description: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });
  };

  const handleAnalyze = async () => {
    if (!terrainGeometry || !currentSunPos) {
      toast({
        title: 'Cannot analyze',
        description: 'Terrain data or sun position not available',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      console.log('🎯 Starting solar analysis:', { mode: analysisMode, resolution, bounds });
      
      if (analysisMode === 'instant') {
        // Instant shadow analysis
        console.log('⏱️ Running instant shadow analysis...');
        const startTime = performance.now();
        
        const result = computeInstantShadows(
          currentSunPos,
          terrainGeometry,
          buildings, // Real buildings from site pack
          bounds,
          resolution
        );
        
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Shadow analysis completed in ${duration}s`);
        
        setShadowResult(result);
        
        toast({
          title: 'Shadow analysis complete',
          description: `${result.percentShaded.toFixed(1)}% shaded • ${duration}s`,
        });
      } else {
        // Daily sun-hours analysis
        console.log('⏱️ Running daily sun-hours analysis...');
        const startTime = performance.now();
        
        const sunPath = getSunPath({
          latitude: centerLat,
          longitude: centerLng,
          date: selectedDate,
          stepMinutes: 15
        });
        
        console.log(`☀️ Generated sun path with ${sunPath.length} positions`);
        
        if (sunPath.length === 0) {
          toast({
            title: 'No daylight',
            description: 'Selected date has no daylight hours',
            variant: 'destructive',
          });
          setIsAnalyzing(false);
          return;
        }
        
        const result = computeSunHours(
          sunPath,
          terrainGeometry,
          buildings, // Real buildings from site pack
          bounds,
          resolution,
          (completed, total) => {
            const pct = (completed / total) * 100;
            setProgress(pct);
            if (completed % 10 === 0) {
              console.log(`📊 Progress: ${completed}/${total} (${pct.toFixed(0)}%)`);
            }
          }
        );
        
        setShadowResult(result);
        
        const avgHours = result.cells.reduce((sum, c) => sum + (c.sunHours || 0), 0) / result.cells.length;
        const duration = ((performance.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Sun-hours analysis complete in ${duration}s`);
        
        toast({
          title: 'Sun-hours analysis complete',
          description: `Avg ${avgHours.toFixed(1)}h direct sun • ${duration}s`,
        });
      }
    } catch (error: any) {
      console.error('❌ Solar analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
    
    // Log completion for debugging
    console.log('🏁 Solar analysis workflow complete');
  };

  const handleExport = async () => {
    if (!shadowResult || !siteId) return;
    
    setExporting(true);
    try {
      console.log('📤 Starting comprehensive export...');
      
      // Generate all export formats
      const pdfOptions = {
        siteName: `Site ${siteId.substring(0, 8)}`,
        siteLocation: { lat: centerLat, lng: centerLng },
        analysisMode,
        shadowResult,
        sunPosition: currentSunPos || undefined,
        date: selectedDate,
        canvasElement: document.querySelector('canvas') as HTMLCanvasElement | undefined,
        elevationSummary: elevationGrid ? {
          provider: elevationGrid.provider,
          accuracy: elevationGrid.accuracy
        } : undefined
      };
      
      const { generateSolarPDF, generateSolarCSV, generateGeoJSON } = await import('@/lib/pdfExport');
      
      // Generate PDF
      console.log('📄 Generating PDF...');
      const pdfBlob = await generateSolarPDF(pdfOptions);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Generate CSV
      console.log('📊 Generating CSV...');
      const csvBlob = generateSolarCSV(shadowResult);
      const csvUrl = URL.createObjectURL(csvBlob);
      
      // Generate GeoJSON
      console.log('🗺️ Generating GeoJSON...');
      const geojson = generateGeoJSON(shadowResult, centerLat, centerLng);
      const geojsonBlob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const geojsonUrl = URL.createObjectURL(geojsonBlob);
      
      // Download all files
      const downloadLink = (url: string, filename: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      downloadLink(pdfUrl, `solar-analysis-${timestamp}.pdf`);
      downloadLink(csvUrl, `solar-data-${timestamp}.csv`);
      downloadLink(geojsonUrl, `solar-analysis-${timestamp}.geojson`);
      
      console.log('✅ All exports complete');
      
      toast({
        title: 'Export complete',
        description: 'PDF, CSV, and GeoJSON files downloaded',
      });
    } catch (error: any) {
      console.error('❌ Export failed:', error);
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const solarTimes = useMemo(() => 
    getSolarTimes(centerLat, centerLng, selectedDate),
    [centerLat, centerLng, selectedDate]
  );

  // Visualize shadow result on terrain
  const shadowVisualization = useMemo(() => {
    if (!shadowResult || !terrainGeometry) return null;

    const { cells, gridWidth, gridHeight } = shadowResult;
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    cells.forEach((cell, idx) => {
      const x = cell.x;
      const z = cell.y;
      const y = 0.5; // Slightly above terrain

      vertices.push(x, y, z);

      if (analysisMode === 'instant') {
        // Black for shadow, transparent for lit
        const alpha = cell.isShaded ? overlayOpacity : 0;
        colors.push(0, 0, 0, alpha);
      } else {
        // Heat map for sun hours (blue to red)
        const hours = cell.sunHours || 0;
        const maxHours = 12; // Approximate max daylight hours
        const t = Math.min(hours / maxHours, 1);
        
        // Blue (0h) -> Yellow (6h) -> Red (12h)
        let r, g, b;
        if (t < 0.5) {
          r = t * 2;
          g = t * 2;
          b = 1 - t * 2;
        } else {
          r = 1;
          g = 1 - (t - 0.5) * 2;
          b = 0;
        }
        
        colors.push(r, g, b, overlayOpacity);
      }
    });

    // Create quads for each cell
    const cellSize = shadowResult.cellSize;
    for (let j = 0; j < gridHeight - 1; j++) {
      for (let i = 0; i < gridWidth - 1; i++) {
        const a = j * gridWidth + i;
        const b = j * gridWidth + (i + 1);
        const c = (j + 1) * gridWidth + i;
        const d = (j + 1) * gridWidth + (i + 1);

        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    geometry.setIndex(indices);

    return geometry;
  }, [shadowResult, overlayOpacity, analysisMode, terrainGeometry]);

  if (loadingElevation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading terrain data...</span>
      </div>
    );
  }

  if (!elevationGrid) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Sun className="w-16 h-16 text-yellow-500" />
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Solar & Shadow Analysis</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Elevation data is required for accurate shadow casting. Please load terrain data from the Elevation tab first.
          </p>
        </div>
        <Button onClick={loadElevationData} size="lg">
          Load Terrain Data
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Sun className="w-6 h-6 text-yellow-500" />
              Solar & Shadow Analysis
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Architect-grade shadow casting with precise sun position (NREL SPA)
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                Real Terrain • 1× Scale
              </Badge>
              {buildingValidation && buildingValidation.stats.total > 0 && (
                <Badge variant="outline" className="text-xs">
                  🏢 {buildingValidation.stats.total} buildings loaded
                </Badge>
              )}
            </div>
            {buildingValidation?.warnings && buildingValidation.warnings.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                {buildingValidation.warnings.map((warning: string, idx: number) => (
                  <div key={idx}>⚠️ {warning}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Mode Tabs */}
        <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="instant">
              <Moon className="w-4 h-4 mr-2" />
              Instant Shadow
            </TabsTrigger>
            <TabsTrigger value="daily">
              <CloudSun className="w-4 h-4 mr-2" />
              Daily Sun-Hours
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instant" className="space-y-4">
            {/* Date Selection */}
            <div>
              <Label className="mb-2 block">Date</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetDate('summer')}
                >
                  <Sunrise className="w-4 h-4 mr-1" />
                  Summer Solstice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetDate('winter')}
                >
                  <Sunset className="w-4 h-4 mr-1" />
                  Winter Solstice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetDate('spring')}
                >
                  Spring Equinox
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetDate('fall')}
                >
                  Fall Equinox
                </Button>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-1.5 border rounded text-sm"
                />
              </div>
            </div>

            {/* Time Slider */}
            <div>
              <Label className="mb-2 block">
                Time: {formatTime(selectedTime)}
                {currentSunPos && (
                  <span className="ml-3 text-muted-foreground font-normal">
                    Alt: {currentSunPos.altitude.toFixed(1)}° • Az: {currentSunPos.azimuth.toFixed(1)}°
                  </span>
                )}
              </Label>
              <Slider
                value={[selectedTime]}
                onValueChange={([v]) => setSelectedTime(v)}
                min={0}
                max={24 * 60 - 1}
                step={15}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Sunrise className="w-3 h-3" />
                  {solarTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  {solarTimes.solarNoon.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-1">
                  <Sunset className="w-3 h-3" />
                  {solarTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <div>
              <Label className="mb-2 block">Analysis Date</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetDate('summer')}
                >
                  <Sunrise className="w-4 h-4 mr-1" />
                  Summer Solstice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetDate('winter')}
                >
                  <Sunset className="w-4 h-4 mr-1" />
                  Winter Solstice
                </Button>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-1.5 border rounded text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Dawn to dusk in 15-minute intervals
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Resolution Controls */}
        <div className="space-y-2">
          <Label>
            Resolution: {resolution}m cell size
            {bounds && (
              <span className="ml-2 text-muted-foreground font-normal">
                ({Math.ceil((bounds.maxX - bounds.minX) / resolution) * Math.ceil((bounds.maxY - bounds.minY) / resolution)} cells)
              </span>
            )}
          </Label>
          <div className="flex gap-2">
            <Button
              variant={resolution === 5 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResolution(5)}
            >
              Low (5m)
            </Button>
            <Button
              variant={resolution === 2 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResolution(2)}
            >
              Medium (2m)
            </Button>
            <Button
              variant={resolution === 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResolution(1)}
            >
              High (1m)
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !terrainGeometry}
            className="flex-1"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing... {progress > 0 && `${Math.round(progress)}%`}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 mr-2" />
                Run {analysisMode === 'instant' ? 'Shadow' : 'Sun-Hours'} Analysis
              </>
            )}
          </Button>
          
          {shadowResult && (
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              size="lg"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* 3D Visualization */}
      {terrainGeometry && (
        <Card className="h-[600px] relative overflow-hidden">
          <div className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5 shadow-lg">
            {currentSunPos && (
              <>
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
                      : `${(shadowResult.cells.reduce((s, c) => s + (c.sunHours || 0), 0) / shadowResult.cells.length).toFixed(1)}h avg sun`
                    }
                  </div>
                )}
              </>
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
            
            {/* Lighting */}
            <ambientLight intensity={0.3} />
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
                color="#8b7355"
                roughness={0.95}
                metalness={0.05}
              />
            </mesh>
            
            {/* Shadow overlay */}
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
            
            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <planeGeometry args={[300, 300]} />
              <shadowMaterial opacity={0.15} />
            </mesh>
            
            <fog attach="fog" args={['#f0f0f0', 100, 300]} />
          </Canvas>
        </Card>
      )}

      {/* Results */}
      {shadowResult && (
        <div className="space-y-4">
          {/* Validation Report */}
          <SolarValidationReport
            shadowResult={shadowResult}
            elevationAccuracy={elevationGrid?.accuracy}
            buildingCount={buildings.length}
            buildingWarnings={buildingValidation?.warnings}
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analysisMode === 'instant' ? (
              <>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Area Shaded</div>
                  <div className="text-2xl font-bold">{shadowResult.percentShaded.toFixed(1)}%</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Area Lit</div>
                  <div className="text-2xl font-bold">{(100 - shadowResult.percentShaded).toFixed(1)}%</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Sun Altitude</div>
                  <div className="text-2xl font-bold">{currentSunPos?.altitude.toFixed(1)}°</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Sun Azimuth</div>
                  <div className="text-2xl font-bold">{currentSunPos?.azimuth.toFixed(1)}°</div>
                </Card>
              </>
            ) : (
              <>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Avg Sun Hours</div>
                  <div className="text-2xl font-bold">
                    {(shadowResult.cells.reduce((s, c) => s + (c.sunHours || 0), 0) / shadowResult.cells.length).toFixed(1)}h
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Max Sun Hours</div>
                  <div className="text-2xl font-bold">
                    {Math.max(...shadowResult.cells.map(c => c.sunHours || 0)).toFixed(1)}h
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Min Sun Hours</div>
                  <div className="text-2xl font-bold">
                    {Math.min(...shadowResult.cells.map(c => c.sunHours || 0)).toFixed(1)}h
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Analysis Points</div>
                  <div className="text-2xl font-bold">{shadowResult.cells.length.toLocaleString()}</div>
                </Card>
              </>
            )}
          </div>

          {/* Overlay Opacity Control */}
          <Card className="p-4">
            <Label className="mb-2 block">
              Overlay Opacity: {Math.round(overlayOpacity * 100)}%
            </Label>
            <Slider
              value={[overlayOpacity]}
              onValueChange={([v]) => setOverlayOpacity(v)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
