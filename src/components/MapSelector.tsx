import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MapPin, Circle, Pentagon, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface MapSelectorProps {
  onBoundarySelected: (data: {
    locationName: string;
    centerLat: number;
    centerLng: number;
    boundaryGeoJSON: any;
    areaSqm: number;
    radiusMeters?: number;
  }) => void;
}

const MapSelector = ({ onBoundarySelected }: MapSelectorProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [marker, setMarker] = useState<maplibregl.Marker | null>(null);
  const [radius, setRadius] = useState(500);
  const [circleLayer, setCircleLayer] = useState<any>(null);
  const [boundaryMode, setBoundaryMode] = useState<'circle' | 'custom'>('circle');
  const [customPolygon, setCustomPolygon] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Use OpenStreetMap tiles for better detail
    const streetStyle = {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: streetStyle as any,
      center: [-0.118092, 51.509865], // London default
      zoom: 13,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Initialize MapboxDraw for custom boundaries
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'simple_select',
    });

    // Add draw control but hide it initially (will show when custom mode is selected)
    map.current.addControl(draw.current as any);

    // Listen for polygon creation/update
    map.current.on('draw.create', handleDrawUpdate);
    map.current.on('draw.update', handleDrawUpdate);
    map.current.on('draw.delete', () => setCustomPolygon(null));

    return () => {
      map.current?.remove();
    };
  }, []);

  const handleDrawUpdate = () => {
    if (!draw.current) return;
    
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const polygon = data.features[0];
      setCustomPolygon(polygon);
      toast.success('Boundary drawn! Click confirm when ready.');
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    try {
      // Using Nominatim (OpenStreetMap) geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        // Fly to location
        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
        });

        // Add/update marker
        if (marker) {
          marker.remove();
        }
        const newMarker = new maplibregl.Marker({ color: '#5f7d3a' })
          .setLngLat([longitude, latitude])
          .addTo(map.current!);
        setMarker(newMarker);

        // Draw circle
        drawCircle(longitude, latitude, radius);

        toast.success(`Found: ${display_name}`);
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const drawCircle = (lng: number, lat: number, radiusMeters: number) => {
    if (!map.current) return;

    const center = turf.point([lng, lat]);
    const circle = turf.circle(center, radiusMeters / 1000, {
      steps: 64,
      units: 'kilometers',
    });

    // Remove existing circle
    if (circleLayer) {
      if (map.current.getLayer('circle-fill')) {
        map.current.removeLayer('circle-fill');
      }
      if (map.current.getLayer('circle-outline')) {
        map.current.removeLayer('circle-outline');
      }
      if (map.current.getSource('circle')) {
        map.current.removeSource('circle');
      }
    }

    // Add new circle
    map.current.addSource('circle', {
      type: 'geojson',
      data: circle,
    });

    map.current.addLayer({
      id: 'circle-fill',
      type: 'fill',
      source: 'circle',
      paint: {
        'fill-color': '#5f7d3a',
        'fill-opacity': 0.2,
      },
    });

    map.current.addLayer({
      id: 'circle-outline',
      type: 'line',
      source: 'circle',
      paint: {
        'line-color': '#5f7d3a',
        'line-width': 2,
      },
    });

    setCircleLayer(circle);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (marker) {
      const lngLat = marker.getLngLat();
      drawCircle(lngLat.lng, lngLat.lat, newRadius);
    }
  };

  const confirmSelection = async () => {
    if (boundaryMode === 'circle') {
      if (!marker || !circleLayer) {
        toast.error('Please search for a location first');
        return;
      }

      const lngLat = marker.getLngLat();
      const area = turf.area(circleLayer);

      // Get location name from reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lngLat.lat}&lon=${lngLat.lng}`
        );
        const data = await response.json();
        const locationName = data.display_name || `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;

        onBoundarySelected({
          locationName,
          centerLat: lngLat.lat,
          centerLng: lngLat.lng,
          boundaryGeoJSON: circleLayer,
          areaSqm: area,
          radiusMeters: radius,
        });
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        onBoundarySelected({
          locationName: `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`,
          centerLat: lngLat.lat,
          centerLng: lngLat.lng,
          boundaryGeoJSON: circleLayer,
          areaSqm: area,
          radiusMeters: radius,
        });
      }
    } else {
      // Custom boundary mode
      if (!customPolygon) {
        toast.error('Please draw a custom boundary on the map first');
        return;
      }

      const area = turf.area(customPolygon);
      const centroid = turf.centroid(customPolygon);
      const [lng, lat] = centroid.geometry.coordinates;

      // Get location name from reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        const locationName = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        onBoundarySelected({
          locationName,
          centerLat: lat,
          centerLng: lng,
          boundaryGeoJSON: customPolygon,
          areaSqm: area,
        });
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        onBoundarySelected({
          locationName: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          centerLat: lat,
          centerLng: lng,
          boundaryGeoJSON: customPolygon,
          areaSqm: area,
        });
      }
    }
  };

  const handleModeChange = (mode: 'circle' | 'custom') => {
    setBoundaryMode(mode);
    
    if (mode === 'custom') {
      // Enable draw mode
      if (draw.current) {
        draw.current.changeMode('draw_polygon');
      }
      // Hide circle if exists
      if (map.current) {
        if (map.current.getLayer('circle-fill')) {
          map.current.setLayoutProperty('circle-fill', 'visibility', 'none');
        }
        if (map.current.getLayer('circle-outline')) {
          map.current.setLayoutProperty('circle-outline', 'visibility', 'none');
        }
      }
    } else {
      // Circle mode
      if (draw.current) {
        draw.current.deleteAll();
        draw.current.changeMode('simple_select');
      }
      setCustomPolygon(null);
      // Show circle if exists
      if (map.current) {
        if (map.current.getLayer('circle-fill')) {
          map.current.setLayoutProperty('circle-fill', 'visibility', 'visible');
        }
        if (map.current.getLayer('circle-outline')) {
          map.current.setLayoutProperty('circle-outline', 'visibility', 'visible');
        }
      }
    }
  };

  const toggleMapStyle = () => {
    if (!map.current) return;
    
    const newStyle = mapStyle === 'street' ? 'satellite' : 'street';
    setMapStyle(newStyle);

    // Preserve current view
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    
    if (newStyle === 'satellite') {
      // Switch to satellite imagery
      const satelliteStyle = {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '© Esri, Maxar, Earthstar Geographics',
          },
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };
      map.current.setStyle(satelliteStyle as any);
    } else {
      // Switch to street map
      const streetStyle = {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };
      map.current.setStyle(streetStyle as any);
    }

    // Restore view after style change
    map.current.once('styledata', () => {
      map.current?.setCenter(center);
      map.current?.setZoom(zoom);
      
      // Re-add circle if it exists
      if (circleLayer && boundaryMode === 'circle') {
        map.current?.addSource('circle', {
          type: 'geojson',
          data: circleLayer,
        });

        map.current?.addLayer({
          id: 'circle-fill',
          type: 'fill',
          source: 'circle',
          paint: {
            'fill-color': '#5f7d3a',
            'fill-opacity': 0.2,
          },
        });

        map.current?.addLayer({
          id: 'circle-outline',
          type: 'line',
          source: 'circle',
          paint: {
            'line-color': '#5f7d3a',
            'line-width': 2,
          },
        });
      }
    });

    toast.success(`Switched to ${newStyle === 'satellite' ? 'Satellite' : 'Street'} view`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 shadow-soft space-y-4">
        {/* Boundary Mode Selector */}
        <Tabs value={boundaryMode} onValueChange={(v) => handleModeChange(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="circle" className="gap-2">
              <Circle className="w-4 h-4" />
              Circle Radius
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <Pentagon className="w-4 h-4" />
              Custom Boundary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="circle" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for an address or place..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  className="pl-9"
                />
              </div>
              <Button onClick={searchLocation} disabled={isSearching} variant="default">
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Radius: {radius}m
              </label>
              <Input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100m</span>
                <span>2000m</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for a location to draw boundary..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  className="pl-9"
                />
              </div>
              <Button onClick={searchLocation} disabled={isSearching} variant="default">
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Draw Custom Boundary</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Search for a location (optional) or navigate the map</li>
                <li>Click on the map to start drawing your boundary</li>
                <li>Click to add each corner point</li>
                <li>Double-click or click the first point to complete</li>
                <li>Use the trash icon to delete and redraw</li>
              </ol>
            </div>
            {customPolygon && (
              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                <p className="font-medium text-primary">
                  ✓ Custom boundary drawn ({(turf.area(customPolygon) / 1000000).toFixed(2)} km²)
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button onClick={confirmSelection} variant="hero" className="w-full" size="lg">
          <MapPin className="w-4 h-4 mr-2" />
          Confirm Site Boundary
        </Button>
      </div>

      <div className="relative">
        <div
          ref={mapContainer}
          className="w-full h-[500px] rounded-xl overflow-hidden shadow-medium"
        />
        
        {/* Map Style Toggle */}
        <Button
          onClick={toggleMapStyle}
          variant="default"
          size="sm"
          className="absolute top-4 right-14 z-10 shadow-lg"
          title={`Switch to ${mapStyle === 'street' ? 'Satellite' : 'Street'} view`}
        >
          <Layers className="w-4 h-4 mr-2" />
          {mapStyle === 'street' ? 'Satellite' : 'Street'}
        </Button>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-2">How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Choose between circle radius or custom boundary mode</li>
          <li>For circle: Search location and adjust radius</li>
          <li>For custom: Draw your site boundary directly on the map</li>
          <li>Click "Confirm Site Boundary" to proceed</li>
        </ol>
      </div>
    </div>
  );
};

export default MapSelector;
