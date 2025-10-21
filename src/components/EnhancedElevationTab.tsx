import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Mountain, 
  MousePointer, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Download,
  Trash2,
  MapPin,
  Ruler,
  BarChart3,
  Loader2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart,
  ReferenceLine
} from 'recharts';
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { elevationService, ElevationPoint, ElevationProfile } from '@/lib/elevationApi';
import { toast } from 'sonner';

interface EnhancedElevationTabProps {
  mapInstance: any;
}

type MeasurementMode = 'point' | 'path' | null;

interface ProfileData {
  distance: number;
  elevation: number;
  lng: number;
  lat: number;
  grade?: number;
}

const EnhancedElevationTab = ({ mapInstance }: EnhancedElevationTabProps) => {
  const [mode, setMode] = useState<MeasurementMode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pointElevation, setPointElevation] = useState<number | null>(null);
  const [pointCoords, setPointCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [pathData, setPathData] = useState<ProfileData[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<ProfileData | null>(null);
  const [samplingDistance, setSamplingDistance] = useState([10]); // meters
  const [showGrade, setShowGrade] = useState(false);
  const [stats, setStats] = useState<{
    max: number;
    min: number;
    gain: number;
    loss: number;
    distance: number;
    avgGrade: number;
  } | null>(null);
  
  const drawRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);
  const currentPathRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstance) return;

    // Initialize Mapbox Draw with custom styles
    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        // Path line style
        {
          'id': 'gl-draw-line',
          'type': 'line',
          'filter': ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          'layout': { 'line-cap': 'round', 'line-join': 'round' },
          'paint': { 
            'line-color': '#3b82f6', 
            'line-width': 4,
            'line-opacity': 0.8
          }
        },
        // Vertex points
        {
          'id': 'gl-draw-polygon-and-line-vertex-halo-active',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          'paint': { 
            'circle-radius': 8, 
            'circle-color': '#ffffff',
            'circle-stroke-color': '#3b82f6',
            'circle-stroke-width': 2
          }
        },
        {
          'id': 'gl-draw-polygon-and-line-vertex-active',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          'paint': { 
            'circle-radius': 4, 
            'circle-color': '#3b82f6'
          }
        }
      ]
    });

    mapInstance.addControl(drawRef.current, 'top-right');
    mapInstance.on('draw.create', handleDrawCreate);
    mapInstance.on('draw.update', handleDrawCreate);

    return () => {
      try {
        // Check if map is still valid before cleanup
        if (!mapInstance || !mapInstance.getStyle()) {
          console.log('Map already removed, skipping cleanup');
          return;
        }

        // Remove draw control safely
        if (drawRef.current) {
          try {
            if (mapInstance.hasControl && mapInstance.hasControl(drawRef.current)) {
              mapInstance.removeControl(drawRef.current);
            }
          } catch (drawError) {
            console.warn('Error removing draw control:', drawError);
          }
        }

        // Remove event listeners safely
        try {
          mapInstance.off('draw.create', handleDrawCreate);
          mapInstance.off('draw.update', handleDrawCreate);
          mapInstance.off('click', handleMapClick);
          mapInstance.off('mousemove', handleMouseMove);
        } catch (eventError) {
          console.warn('Error removing event listeners:', eventError);
        }
        
        // Clean up markers
        try {
          if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
          }
          if (hoverMarkerRef.current) {
            hoverMarkerRef.current.remove();
            hoverMarkerRef.current = null;
          }
        } catch (markerError) {
          console.warn('Error removing markers:', markerError);
        }
        
        // Reset cursor
        try {
          const canvas = mapInstance.getCanvas && mapInstance.getCanvas();
          if (canvas) {
            canvas.style.cursor = '';
          }
        } catch (cursorError) {
          console.warn('Error resetting cursor:', cursorError);
        }
      } catch (error) {
        console.warn('Error cleaning up elevation tab:', error);
      }
    };
  }, [mapInstance]);

  const handleDrawCreate = useCallback(async (e: any) => {
    if (!mapInstance || mode !== 'path') return;

    const feature = e.features[0];
    if (feature.geometry.type !== 'LineString') return;

    setIsLoading(true);
    currentPathRef.current = feature;

    try {
      // Generate elevation profile using our API service
      const coordinates = feature.geometry.coordinates;
      const profile = await elevationService.generateProfile(coordinates, samplingDistance[0], mapInstance);
      
      // Convert to chart format and calculate grades
      const chartData: ProfileData[] = profile.points.map((point, index) => {
        let grade = 0;
        if (index > 0) {
          const prevPoint = profile.points[index - 1];
          const elevationDiff = point.elevation - prevPoint.elevation;
          const distanceDiff = (point.distance || 0) - (prevPoint.distance || 0);
          grade = distanceDiff > 0 ? (elevationDiff / distanceDiff) * 100 : 0;
        }

        return {
          distance: point.distance || 0,
          elevation: point.elevation,
          lng: point.longitude,
          lat: point.latitude,
          grade
        };
      });

      setPathData(chartData);
      setStats({
        max: profile.stats.maxElevation,
        min: profile.stats.minElevation,
        gain: profile.stats.totalGain,
        loss: profile.stats.totalLoss,
        distance: profile.stats.totalDistance,
        avgGrade: profile.stats.averageGrade
      });

      toast.success(`Elevation profile generated with ${profile.points.length} points`);
    } catch (error) {
      console.error('Error generating elevation profile:', error);
      toast.error('Failed to generate elevation profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [mapInstance, mode, samplingDistance]);

  const handlePointMode = () => {
    if (!mapInstance) return;
    setMode('point');
    setPathData([]);
    setStats(null);
    setHoveredPoint(null);
    
    // Clear existing drawings
    if (drawRef.current) drawRef.current.deleteAll();

    // Set up point measurement
    mapInstance.on('click', handleMapClick);
    mapInstance.off('mousemove', handleMouseMove);
    
    if (mapInstance.getCanvas()) {
      mapInstance.getCanvas().style.cursor = 'crosshair';
    }
  };

  const handleMapClick = async (e: any) => {
    if (!mapInstance || mode !== 'point') return;
    
    const { lng, lat } = e.lngLat;
    setIsLoading(true);

    try {
      const elevation = await elevationService.getElevation(lat, lng, mapInstance);
      setPointElevation(elevation);
      setPointCoords({ lng, lat });

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new mapboxgl.Marker({ 
          color: '#3b82f6',
          scale: 1.2 
        })
          .setLngLat([lng, lat])
          .addTo(mapInstance);
      }

      toast.success(`Elevation: ${formatElevation(elevation)}`);
    } catch (error) {
      console.error('Error getting point elevation:', error);
      toast.error('Failed to get elevation data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePathMode = () => {
    if (!mapInstance) return;
    setMode('path');
    setPointElevation(null);
    setPointCoords(null);
    setHoveredPoint(null);
    
    // Clean up point mode
    mapInstance.off('click', handleMapClick);
    if (mapInstance.getCanvas()) {
      mapInstance.getCanvas().style.cursor = '';
    }
    
    // Remove point marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Enable path drawing
    if (drawRef.current) {
      drawRef.current.changeMode('draw_line_string');
    }

    // Set up mouse tracking for chart hover
    mapInstance.on('mousemove', handleMouseMove);
  };

  const handleMouseMove = (e: any) => {
    if (!pathData.length) return;
    
    // Find closest point on path to mouse
    const mousePoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
    let closestPoint: ProfileData | null = null;
    let minDistance = Infinity;

    pathData.forEach(point => {
      const pathPoint = turf.point([point.lng, point.lat]);
      const distance = turf.distance(mousePoint, pathPoint, { units: 'meters' });
      
      if (distance < minDistance && distance < 50) { // 50m threshold
        minDistance = distance;
        closestPoint = point;
      }
    });

    if (closestPoint && closestPoint !== hoveredPoint) {
      setHoveredPoint(closestPoint);
      
      // Update hover marker
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.setLngLat([closestPoint.lng, closestPoint.lat]);
      } else {
        hoverMarkerRef.current = new mapboxgl.Marker({ 
          color: '#ef4444',
          scale: 0.8 
        })
          .setLngLat([closestPoint.lng, closestPoint.lat])
          .addTo(mapInstance);
      }
    } else if (!closestPoint && hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
      setHoveredPoint(null);
    }
  };

  const handleChartHover = (data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) {
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }
      setHoveredPoint(null);
      return;
    }

    const point = data.activePayload[0].payload as ProfileData;
    setHoveredPoint(point);

    // Update hover marker on map
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.setLngLat([point.lng, point.lat]);
    } else {
      hoverMarkerRef.current = new (window as any).mapboxgl.Marker({ 
        color: '#ef4444',
        scale: 0.8 
      })
        .setLngLat([point.lng, point.lat])
        .addTo(mapInstance);
    }
  };

  const clearAll = () => {
    if (drawRef.current) drawRef.current.deleteAll();
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
    }
    
    setPathData([]);
    setStats(null);
    setPointElevation(null);
    setPointCoords(null);
    setHoveredPoint(null);
    currentPathRef.current = null;
  };

  const exportProfile = () => {
    if (!pathData.length) {
      toast.error('No elevation profile to export');
      return;
    }

    const csvContent = [
      'Distance (m),Elevation (m),Latitude,Longitude,Grade (%)',
      ...pathData.map(point => 
        `${point.distance.toFixed(2)},${point.elevation.toFixed(2)},${point.lat.toFixed(6)},${point.lng.toFixed(6)},${(point.grade || 0).toFixed(2)}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'elevation-profile.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Elevation profile exported to CSV');
  };

  const regenerateProfile = async () => {
    if (!currentPathRef.current) return;
    
    setIsLoading(true);
    try {
      await handleDrawCreate({ features: [currentPathRef.current] });
    } catch (error) {
      console.error('Error regenerating profile:', error);
    }
  };

  const formatElevation = (meters: number) => {
    const feet = meters * 3.28084;
    return `${meters.toFixed(2)}m (${feet.toFixed(2)}ft)`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <Card className="m-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            Elevation Analysis
          </h3>
          {(pathData.length > 0 || pointElevation !== null) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAll}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            variant={mode === 'point' ? 'default' : 'outline'} 
            size="sm" 
            onClick={handlePointMode} 
            className="w-full justify-start gap-2"
            disabled={isLoading}
          >
            <MousePointer className="w-4 h-4" />
            Measure Point
            {mode === 'point' && isLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
          </Button>
          
          <Button 
            variant={mode === 'path' ? 'default' : 'outline'} 
            size="sm" 
            onClick={handlePathMode} 
            className="w-full justify-start gap-2"
            disabled={isLoading}
          >
            <Activity className="w-4 h-4" />
            Draw Path Profile
            {mode === 'path' && isLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
          </Button>
        </div>

        {mode === 'path' && (
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Sampling Distance: {samplingDistance[0]}m
              </label>
              <Slider
                value={samplingDistance}
                onValueChange={setSamplingDistance}
                min={5}
                max={50}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values = more detailed profile, higher API usage
              </p>
            </div>
            
            {currentPathRef.current && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={regenerateProfile}
                className="w-full gap-2"
                disabled={isLoading}
              >
                <BarChart3 className="w-4 h-4" />
                Regenerate Profile
              </Button>
            )}
          </div>
        )}

        {!mode && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            <strong>Point Mode:</strong> Click anywhere to get elevation data.<br/>
            <strong>Path Mode:</strong> Draw a line to generate an elevation profile with detailed analysis.
          </p>
        )}
      </Card>

      {/* Point Results */}
      {mode === 'point' && pointElevation !== null && (
        <Card className="mx-4 mb-4 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Point Elevation</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            {formatElevation(pointElevation)}
          </p>
          {pointCoords && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Latitude:</span><br/>
                {pointCoords.lat.toFixed(6)}°
              </div>
              <div>
                <span className="font-medium">Longitude:</span><br/>
                {pointCoords.lng.toFixed(6)}°
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Path Results */}
      {mode === 'path' && pathData.length > 0 && stats && (
        <div className="flex-1 overflow-auto px-4 pb-4">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <p className="text-xs text-muted-foreground">Highest</p>
              </div>
              <p className="text-lg font-bold text-green-600">{formatElevation(stats.max)}</p>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-3 h-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">Lowest</p>
              </div>
              <p className="text-lg font-bold text-blue-600">{formatElevation(stats.min)}</p>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-orange-500" />
                <p className="text-xs text-muted-foreground">Total Gain</p>
              </div>
              <p className="text-lg font-bold text-orange-600">{formatElevation(stats.gain)}</p>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <p className="text-xs text-muted-foreground">Total Loss</p>
              </div>
              <p className="text-lg font-bold text-red-600">{formatElevation(stats.loss)}</p>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="w-3 h-3 text-purple-500" />
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
              <p className="text-lg font-bold text-purple-600">{formatDistance(stats.distance)}</p>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-3 h-3 text-indigo-500" />
                <p className="text-xs text-muted-foreground">Avg Grade</p>
              </div>
              <p className="text-lg font-bold text-indigo-600">{stats.avgGrade.toFixed(1)}%</p>
            </Card>
          </div>

          {/* Hover Point Info */}
          {hoveredPoint && (
            <Card className="p-3 mb-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">Point Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Distance:</span><br/>
                  <span className="font-medium">{formatDistance(hoveredPoint.distance)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Elevation:</span><br/>
                  <span className="font-medium">{formatElevation(hoveredPoint.elevation)}</span>
                </div>
                {hoveredPoint.grade !== undefined && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Grade:</span><br/>
                    <span className="font-medium">{hoveredPoint.grade.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {/* Chart Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant={showGrade ? "default" : "outline"}
                size="sm"
                onClick={() => setShowGrade(!showGrade)}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Grade
              </Button>
              <Badge variant="secondary" className="text-xs">
                {pathData.length} points
              </Badge>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportProfile}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
          
          {/* Elevation Profile Chart */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Elevation Profile</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart 
                data={pathData}
                onMouseMove={handleChartHover}
                onMouseLeave={() => handleChartHover(null)}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="distance" 
                  label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, className: 'text-xs' }}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => formatDistance(value)}
                />
                <YAxis 
                  label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', className: 'text-xs' }}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value: number, name: string) => [
                    name === 'elevation' ? formatElevation(value) : `${value.toFixed(1)}%`, 
                    name === 'elevation' ? 'Elevation' : 'Grade'
                  ]}
                  labelFormatter={(value) => `Distance: ${formatDistance(value)}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="elevation" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3} 
                />
                {showGrade && (
                  <Line 
                    type="monotone" 
                    dataKey="grade" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={false}
                    yAxisId="grade"
                  />
                )}
                {hoveredPoint && (
                  <ReferenceLine 
                    x={hoveredPoint.distance} 
                    stroke="#ef4444" 
                    strokeDasharray="2 2" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EnhancedElevationTab;