import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Sun, Clock, Calendar, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSunPosition, getSunPath, getPresetDate, getSolarTimes, SunPosition } from '@/lib/solarMath';
import { computeInstantShadows, computeSunHours, ShadowAnalysisResult } from '@/lib/shadowEngine';
import * as THREE from 'three';

interface SolarAnalyzerProps {
  siteId: string;
  centerLat: number;
  centerLng: number;
  terrainGeometry: THREE.BufferGeometry | null;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  onShadowResult?: (result: ShadowAnalysisResult) => void;
}

export function SolarAnalyzer({
  siteId,
  centerLat,
  centerLng,
  terrainGeometry,
  bounds,
  onShadowResult
}: SolarAnalyzerProps) {
  const [analysisMode, setAnalysisMode] = useState<'instant' | 'daily'>('instant');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<number>(12 * 60); // minutes since midnight
  const [resolution, setResolution] = useState<1 | 2 | 5>(2);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSunPos, setCurrentSunPos] = useState<SunPosition | null>(null);
  const [shadowResult, setShadowResult] = useState<ShadowAnalysisResult | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);

  // Update sun position when time/date changes
  useEffect(() => {
    const dateTime = new Date(selectedDate);
    const hours = Math.floor(selectedTime / 60);
    const minutes = selectedTime % 60;
    dateTime.setHours(hours, minutes, 0, 0);
    
    const pos = getSunPosition(centerLat, centerLng, dateTime);
    setCurrentSunPos(pos);
  }, [selectedDate, selectedTime, centerLat, centerLng]);

  const handlePresetDate = (preset: 'summer' | 'winter' | 'spring' | 'fall') => {
    const date = getPresetDate(preset);
    setSelectedDate(date);
    toast.success(`Date set to ${preset} solstice/equinox`);
  };

  const handleAnalyze = async () => {
    if (!terrainGeometry) {
      toast.error('Terrain data not loaded');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      if (analysisMode === 'instant') {
        if (!currentSunPos) return;
        
        const result = computeInstantShadows(
          currentSunPos,
          terrainGeometry,
          [], // TODO: Add buildings from Scenario Studio
          bounds,
          resolution
        );
        
        setShadowResult(result);
        onShadowResult?.(result);
        
        toast.success(`Shadow analysis complete: ${result.percentShaded.toFixed(1)}% shaded`);
      } else {
        // Daily sun-hours analysis
        const sunPath = getSunPath({
          latitude: centerLat,
          longitude: centerLng,
          date: selectedDate,
          stepMinutes: 15
        });
        
        if (sunPath.length === 0) {
          toast.error('No daylight hours for selected date');
          setIsAnalyzing(false);
          return;
        }
        
        const result = computeSunHours(
          sunPath,
          terrainGeometry,
          [], // TODO: Add buildings
          bounds,
          resolution,
          (completed, total) => setProgress((completed / total) * 100)
        );
        
        setShadowResult(result);
        onShadowResult?.(result);
        
        const avgHours = result.cells.reduce((sum, c) => sum + (c.sunHours || 0), 0) / result.cells.length;
        toast.success(`Sun-hours analysis complete: ${avgHours.toFixed(1)}h average`);
      }
    } catch (error) {
      console.error('Solar analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const solarTimes = getSolarTimes(centerLat, centerLng, selectedDate);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Sun className="w-6 h-6 text-yellow-500" />
                Solar & Shadow Analysis
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Architect-grade shadow casting with precise sun position
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Terrain 1× • NREL SPA Algorithm
            </Badge>
          </div>

          {/* Analysis Mode Tabs */}
          <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="instant">
                <Clock className="w-4 h-4 mr-2" />
                Instant Shadow
              </TabsTrigger>
              <TabsTrigger value="daily">
                <Calendar className="w-4 h-4 mr-2" />
                Daily Sun-Hours
              </TabsTrigger>
            </TabsList>

            <TabsContent value="instant" className="space-y-4 mt-4">
              {/* Date Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate('summer')}
                  >
                    Summer Solstice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate('winter')}
                  >
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
                    className="px-3 py-1 border rounded text-sm"
                  />
                </div>
              </div>

              {/* Time Slider */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Time: {formatTime(selectedTime)}
                  {currentSunPos && (
                    <span className="ml-2 text-muted-foreground">
                      (Alt: {currentSunPos.altitude.toFixed(1)}°, Az: {currentSunPos.azimuth.toFixed(1)}°)
                    </span>
                  )}
                </label>
                <Slider
                  value={[selectedTime]}
                  onValueChange={([v]) => setSelectedTime(v)}
                  min={0}
                  max={24 * 60 - 1}
                  step={15}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Sunrise: {solarTimes.sunrise.toLocaleTimeString()}</span>
                  <span>Noon: {solarTimes.solarNoon.toLocaleTimeString()}</span>
                  <span>Sunset: {solarTimes.sunset.toLocaleTimeString()}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="daily" className="space-y-4 mt-4">
              {/* Date for daily analysis */}
              <div>
                <label className="text-sm font-medium mb-2 block">Analysis Date</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate('summer')}
                  >
                    Summer Solstice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetDate('winter')}
                  >
                    Winter Solstice
                  </Button>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="px-3 py-1 border rounded text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Analyzes from dawn to dusk in 15-minute intervals
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Resolution */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Resolution: {resolution}m cell size
            </label>
            <div className="flex gap-2">
              <Button
                variant={resolution === 5 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResolution(5)}
              >
                Low (5m) - Fast
              </Button>
              <Button
                variant={resolution === 2 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResolution(2)}
              >
                Medium (2m) - Balanced
              </Button>
              <Button
                variant={resolution === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResolution(1)}
              >
                High (1m) - Detailed
              </Button>
            </div>
            {bounds && (
              <p className="text-xs text-muted-foreground mt-2">
                Estimated cells: {Math.ceil((bounds.maxX - bounds.minX) / resolution) * Math.ceil((bounds.maxY - bounds.minY) / resolution)}
              </p>
            )}
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !terrainGeometry}
            className="w-full"
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

          {/* Results */}
          {shadowResult && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Results</h3>
              <div className="grid grid-cols-2 gap-4">
                {analysisMode === 'instant' ? (
                  <>
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">Area Shaded</div>
                      <div className="text-2xl font-bold">{shadowResult.percentShaded.toFixed(1)}%</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">Sun Altitude</div>
                      <div className="text-2xl font-bold">{currentSunPos?.altitude.toFixed(1)}°</div>
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
                  </>
                )}
              </div>

              {/* Overlay Opacity */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Overlay Opacity: {Math.round(overlayOpacity * 100)}%
                </label>
                <Slider
                  value={[overlayOpacity]}
                  onValueChange={([v]) => setOverlayOpacity(v)}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
