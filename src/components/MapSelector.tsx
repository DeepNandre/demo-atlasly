import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Circle } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [marker, setMarker] = useState<maplibregl.Marker | null>(null);
  const [radius, setRadius] = useState(500);
  const [circleLayer, setCircleLayer] = useState<any>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [-0.118092, 51.509865], // London default
      zoom: 13,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

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
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 shadow-soft space-y-4">
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

        <Button onClick={confirmSelection} variant="hero" className="w-full" size="lg">
          <MapPin className="w-4 h-4 mr-2" />
          Confirm Site Boundary
        </Button>
      </div>

      <div
        ref={mapContainer}
        className="w-full h-[500px] rounded-xl overflow-hidden shadow-medium"
      />

      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-2">How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Search for your site location using the address or place name</li>
          <li>Adjust the radius to define your site boundary</li>
          <li>Click "Confirm Site Boundary" to proceed with data generation</li>
        </ol>
      </div>
    </div>
  );
};

export default MapSelector;
