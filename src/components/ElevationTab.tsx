import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mountain, MousePointer, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import * as turf from '@turf/turf';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface ElevationTabProps {
  mapInstance: any;
}

type MeasurementMode = 'point' | 'path' | null;

interface ElevationPoint {
  distance: number;
  elevation: number;
  lng: number;
  lat: number;
}

const ElevationTab = ({ mapInstance }: ElevationTabProps) => {
  const [mode, setMode] = useState<MeasurementMode>(null);
  const [pointElevation, setPointElevation] = useState<number | null>(null);
  const [pointCoords, setPointCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [pathData, setPathData] = useState<ElevationPoint[]>([]);
  const [stats, setStats] = useState<{
    max: number;
    min: number;
    gain: number;
    loss: number;
  } | null>(null);
  
  const drawRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstance) return;

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        {
          'id': 'gl-draw-line',
          'type': 'line',
          'filter': ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          'layout': { 'line-cap': 'round', 'line-join': 'round' },
          'paint': { 'line-color': 'hsl(var(--primary))', 'line-width': 3 }
        },
        {
          'id': 'gl-draw-polygon-and-line-vertex-halo-active',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          'paint': { 'circle-radius': 8, 'circle-color': '#FFF' }
        },
        {
          'id': 'gl-draw-polygon-and-line-vertex-active',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          'paint': { 'circle-radius': 5, 'circle-color': 'hsl(var(--primary))' }
        }
      ]
    });

    mapInstance.addControl(drawRef.current, 'top-right');
    mapInstance.on('draw.create', handleDrawCreate);

    return () => {
      try {
        if (mapInstance.hasControl(drawRef.current)) {
          mapInstance.removeControl(drawRef.current);
        }
        mapInstance.off('draw.create', handleDrawCreate);
        mapInstance.off('click', handleMapClick);
        if (markerRef.current) markerRef.current.remove();
        if (hoverMarkerRef.current) hoverMarkerRef.current.remove();
        if (mapInstance.getCanvas()) {
          mapInstance.getCanvas().style.cursor = '';
        }
      } catch (error) {
        console.warn('Error cleaning up elevation tab:', error);
      }
    };
  }, [mapInstance]);

  const handleDrawCreate = async (e: any) => {
    if (!mapInstance || mode !== 'path') return;

    const feature = e.features[0];
    if (feature.geometry.type !== 'LineString') return;

    const line = turf.lineString(feature.geometry.coordinates);
    const length = turf.length(line, { units: 'meters' });
    const samplingInterval = 5;
    const numSamples = Math.floor(length / samplingInterval);
    const elevationData: ElevationPoint[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const distance = i * samplingInterval;
      const point = turf.along(line, distance / 1000, { units: 'kilometers' });
      const [lng, lat] = point.geometry.coordinates;
      const elevation = mapInstance.queryTerrainElevation([lng, lat], { exaggerated: false }) || 0;
      elevationData.push({ distance, elevation, lng, lat });
    }

    const elevations = elevationData.map(p => p.elevation);
    const max = Math.max(...elevations);
    const min = Math.min(...elevations);
    
    let gain = 0, loss = 0;
    for (let i = 1; i < elevationData.length; i++) {
      const diff = elevationData[i].elevation - elevationData[i - 1].elevation;
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }

    setPathData(elevationData);
    setStats({ max, min, gain, loss });
  };

  const handlePointMode = () => {
    if (!mapInstance) return;
    setMode('point');
    setPathData([]);
    setStats(null);
    if (drawRef.current) drawRef.current.deleteAll();

    mapInstance.on('click', handleMapClick);
    if (mapInstance.getCanvas()) {
      mapInstance.getCanvas().style.cursor = 'crosshair';
    }
  };

  const handleMapClick = (e: any) => {
    if (!mapInstance || mode !== 'point') return;
    const { lng, lat } = e.lngLat;
    const elevation = mapInstance.queryTerrainElevation([lng, lat], { exaggerated: false });
    setPointElevation(elevation || 0);
    setPointCoords({ lng, lat });

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new (window as any).mapboxgl.Marker({ color: 'hsl(var(--primary))' })
        .setLngLat([lng, lat])
        .addTo(mapInstance);
    }
  };

  const handlePathMode = () => {
    if (!mapInstance) return;
    setMode('path');
    setPointElevation(null);
    setPointCoords(null);
    
    // Clean up point mode
    mapInstance.off('click', handleMapClick);
    if (mapInstance.getCanvas()) {
      mapInstance.getCanvas().style.cursor = '';
    }
    
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (drawRef.current) drawRef.current.changeMode('draw_line_string');
  };

  const formatElevation = (meters: number) => {
    const feet = meters * 3.28084;
    return `${meters.toFixed(2)}m (${feet.toFixed(2)}ft)`;
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="m-4 p-4">
        <h3 className="font-semibold mb-3 text-lg">Elevation Analysis</h3>
        <div className="flex flex-col gap-2">
          <Button 
            variant={mode === 'point' ? 'default' : 'outline'} 
            size="sm" 
            onClick={handlePointMode} 
            className="w-full justify-start gap-2"
          >
            <MousePointer className="w-4 h-4" />
            Measure Point
          </Button>
          <Button 
            variant={mode === 'path' ? 'default' : 'outline'} 
            size="sm" 
            onClick={handlePathMode} 
            className="w-full justify-start gap-2"
          >
            <Activity className="w-4 h-4" />
            Draw Path Profile
          </Button>
        </div>
        {!mode && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Select a mode: Click a point on the map to get its elevation, or draw a path to generate an elevation profile.
          </p>
        )}
      </Card>

      {mode === 'point' && pointElevation !== null && (
        <Card className="mx-4 mb-4 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mountain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Point Elevation</h3>
          </div>
          <p className="text-2xl font-bold text-primary">{formatElevation(pointElevation)}</p>
          {pointCoords && (
            <p className="text-xs text-muted-foreground mt-2">
              Lat: {pointCoords.lat.toFixed(6)}, Lng: {pointCoords.lng.toFixed(6)}
            </p>
          )}
        </Card>
      )}

      {mode === 'path' && pathData.length > 0 && stats && (
        <div className="flex-1 overflow-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Max</p>
              </div>
              <p className="text-lg font-bold">{stats.max.toFixed(1)}m</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Min</p>
              </div>
              <p className="text-lg font-bold">{stats.min.toFixed(1)}m</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <p className="text-xs text-muted-foreground">Gain</p>
              </div>
              <p className="text-lg font-bold text-green-600">{stats.gain.toFixed(1)}m</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-3 h-3 text-orange-500" />
                <p className="text-xs text-muted-foreground">Loss</p>
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.loss.toFixed(1)}m</p>
            </Card>
          </div>
          
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Elevation Profile</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={pathData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="distance" 
                  label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, className: 'text-xs' }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', className: 'text-xs' }}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value: number) => [`${value.toFixed(1)}m`, 'Elevation']}
                />
                <Area 
                  type="monotone" 
                  dataKey="elevation" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ElevationTab;
