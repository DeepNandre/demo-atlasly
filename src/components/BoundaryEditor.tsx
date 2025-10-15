import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import shp from 'shpjs';
import * as toGeoJSON from '@tmcw/togeojson';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Upload, Trash2, Check } from 'lucide-react';

interface BoundaryEditorProps {
  onBoundaryConfirmed: (data: {
    locationName: string;
    centerLat: number;
    centerLng: number;
    boundaryGeoJSON: any;
    areaSqm: number;
  }) => void;
}

export const BoundaryEditor = ({ onBoundaryConfirmed }: BoundaryEditorProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [currentArea, setCurrentArea] = useState<number>(0);
  const [currentPerimeter, setCurrentPerimeter] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [0, 0],
      zoom: 2,
    });

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'draw_polygon',
    });

    map.current.addControl(draw.current);

    const updateMetrics = () => {
      const data = draw.current?.getAll();
      if (data && data.features.length > 0) {
        const feature = data.features[0];
        const area = turf.area(feature);
        const perimeter = turf.length(feature, { units: 'meters' });
        setCurrentArea(area);
        setCurrentPerimeter(perimeter);
        setHasDrawing(true);
      } else {
        setCurrentArea(0);
        setCurrentPerimeter(0);
        setHasDrawing(false);
      }
    };

    map.current.on('draw.create', updateMetrics);
    map.current.on('draw.update', updateMetrics);
    map.current.on('draw.delete', updateMetrics);

    return () => {
      map.current?.remove();
    };
  }, []);

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location');
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        map.current?.flyTo({
          center: [parseFloat(lon), parseFloat(lat)],
          zoom: 15,
          essential: true,
        });
        toast.success(`Found: ${display_name}`);
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    }
  };

  const validateBoundary = (geojson: any): { valid: boolean; error?: string } => {
    try {
      if (geojson.type === 'FeatureCollection') {
        if (geojson.features.length === 0) {
          return { valid: false, error: 'No features in boundary' };
        }
        geojson = geojson.features[0];
      }

      const polygon = geojson.geometry || geojson;

      // Check for self-intersections using turf
      const kinks = turf.kinks(polygon);
      if (kinks.features.length > 0) {
        return { valid: false, error: 'Boundary has self-intersections' };
      }

      // Ensure closed rings
      const coords = polygon.coordinates[0];
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return { valid: false, error: 'Boundary ring is not closed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid boundary geometry' };
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const text = await file.text();
        const geojson = JSON.parse(text);
        loadBoundaryFromGeoJSON(geojson);
      } else if (fileName.endsWith('.kml')) {
        const text = await file.text();
        const parser = new DOMParser();
        const kml = parser.parseFromString(text, 'text/xml');
        const geojson = toGeoJSON.kml(kml);
        loadBoundaryFromGeoJSON(geojson);
      } else if (fileName.endsWith('.zip')) {
        // Shapefile
        const arrayBuffer = await file.arrayBuffer();
        const geojson = await shp(arrayBuffer);
        loadBoundaryFromGeoJSON(geojson);
      } else if (fileName.endsWith('.dxf')) {
        toast.error('DXF import coming soon - please use GeoJSON, KML, or Shapefile');
      } else {
        toast.error('Unsupported file format. Use .geojson, .kml, .shp (zipped), or .dxf');
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to parse file');
    }
  };

  const loadBoundaryFromGeoJSON = (geojson: any) => {
    const validation = validateBoundary(geojson);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid boundary');
      return;
    }

    draw.current?.deleteAll();
    
    let feature = geojson;
    if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
      feature = geojson.features[0];
    }

    if (feature.geometry.type !== 'Polygon') {
      toast.error('Boundary must be a polygon');
      return;
    }

    draw.current?.add(feature);
    setHasDrawing(true);

    // Zoom to bounds
    const bbox = turf.bbox(feature);
    map.current?.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 50 }
    );

    toast.success('Boundary loaded successfully');
  };

  const confirmBoundary = async () => {
    const data = draw.current?.getAll();
    if (!data || data.features.length === 0) {
      toast.error('Please draw or upload a boundary');
      return;
    }

    const feature = data.features[0];
    const validation = validateBoundary(feature);
    
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid boundary');
      return;
    }

    try {
      const area = turf.area(feature);
      const centroid = turf.centroid(feature);
      const [lng, lat] = centroid.geometry.coordinates;

      // Reverse geocode to get location name
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const locationData = await response.json();
      const locationName = locationData.display_name || 'Custom Boundary';

      onBoundaryConfirmed({
        locationName,
        centerLat: lat,
        centerLng: lng,
        boundaryGeoJSON: feature,
        areaSqm: area,
      });
    } catch (error) {
      console.error('Boundary confirmation error:', error);
      toast.error('Failed to process boundary');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
          className="flex-1"
        />
        <Button onClick={searchLocation}>Search</Button>
      </div>

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,.kml,.zip,.dxf"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Boundary
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            draw.current?.deleteAll();
            setHasDrawing(false);
          }}
          disabled={!hasDrawing}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
        <Button
          onClick={confirmBoundary}
          disabled={!hasDrawing}
          className="flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          Confirm Boundary
        </Button>
      </div>

      <div
        ref={mapContainer}
        className="w-full h-[500px] rounded-lg border border-border"
      />

      {hasDrawing && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h3 className="font-semibold text-sm">Boundary Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Area:</span>
              <span className="ml-2 font-medium">{(currentArea / 10000).toFixed(2)} hectares</span>
            </div>
            <div>
              <span className="text-muted-foreground">Perimeter:</span>
              <span className="ml-2 font-medium">{currentPerimeter.toFixed(2)} meters</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground space-y-1">
        <p>• Click on the map to draw a polygon boundary</p>
        <p>• Upload .geojson, .kml, or .shp (zipped) files</p>
        <p>• Drag vertices to adjust the boundary</p>
        <p>• Boundaries must be closed with no self-intersections</p>
      </div>
    </div>
  );
};
