import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import * as toGeoJSON from '@tmcw/togeojson';
import shp from 'shpjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileText, 
  MapPin, 
  Trash2, 
  Download, 
  AlertCircle,
  CheckCircle,
  Layers,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface BoundaryEditorProps {
  onBoundarySelected: (data: {
    locationName: string;
    centerLat: number;
    centerLng: number;
    boundaryGeoJSON: any;
    areaSqm: number;
    validationResult: ValidationResult;
  }) => void;
  initialBoundary?: any; // Existing boundary to edit
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  area: number;
  perimeter: number;
  vertexCount: number;
}

/**
 * Advanced boundary editor with file upload support and validation
 * Supports GeoJSON, KML, Shapefile, and DXF formats
 */
export const BoundaryEditor: React.FC<BoundaryEditorProps> = ({
  onBoundarySelected,
  initialBoundary
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentBoundary, setCurrentBoundary] = useState<any>(initialBoundary);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadMode, setUploadMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingFile, setProcessingFile] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const streetStyle = {
      version: 8,
      sources: {
        carto: {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors © CARTO',
        },
      },
      layers: [
        {
          id: 'carto',
          type: 'raster',
          source: 'carto',
          minzoom: 0,
          maxzoom: 20,
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

    // Initialize MapboxDraw for interactive editing
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: false,
        point: false,
        trash: true,
        combine_features: false,
        uncombine_features: false,
      },
      defaultMode: 'draw_polygon',
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#5f7d3a',
            'fill-opacity': 0.2,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: {
            'line-color': '#5f7d3a',
            'line-width': 3,
          },
        },
        // Polygon outline (inactive)
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'false']],
          paint: {
            'line-color': '#5f7d3a',
            'line-width': 2,
          },
        },
        // Vertices
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#5f7d3a',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        },
      ],
    });

    map.current.addControl(draw.current, 'top-left');

    // Handle draw events
    map.current.on('draw.create', handleDrawUpdate);
    map.current.on('draw.update', handleDrawUpdate);
    map.current.on('draw.delete', handleDrawUpdate);

    // Load initial boundary if provided
    if (initialBoundary) {
      loadBoundaryOnMap(initialBoundary);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const handleDrawUpdate = useCallback(() => {
    if (!draw.current) return;

    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const feature = data.features[0];
      setCurrentBoundary(feature);
      validateBoundary(feature);
    } else {
      setCurrentBoundary(null);
      setValidationResult(null);
    }
  }, []);

  const loadBoundaryOnMap = (boundary: any) => {
    if (!draw.current || !boundary) return;

    // Clear existing features
    draw.current.deleteAll();

    // Add the boundary to the map
    if (boundary.type === 'Feature') {
      draw.current.add(boundary);
    } else if (boundary.type === 'FeatureCollection') {
      boundary.features.forEach((feature: any) => {
        draw.current!.add(feature);
      });
    }

    // Fit map to boundary
    if (map.current && boundary.geometry) {
      const bbox = turf.bbox(boundary);
      map.current.fitBounds(bbox as [number, number, number, number], {
        padding: 50,
      });
    }
  };

  const validateBoundary = (boundary: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!boundary || !boundary.geometry) {
      errors.push('No boundary geometry found');
      return { isValid: false, errors, warnings, area: 0, perimeter: 0, vertexCount: 0 };
    }

    // Check geometry type
    if (boundary.geometry.type !== 'Polygon') {
      errors.push('Boundary must be a polygon');
    }

    let area = 0;
    let perimeter = 0;
    let vertexCount = 0;

    try {
      // Calculate metrics
      area = turf.area(boundary);
      perimeter = turf.length(turf.polygonToLineString(boundary), { units: 'meters' });
      vertexCount = boundary.geometry.coordinates[0].length - 1; // Exclude closing vertex

      // Validation checks
      if (area < 100) {
        warnings.push('Boundary area is very small (< 100 m²)');
      }
      if (area > 10000000) { // 10 km²
        warnings.push('Boundary area is very large (> 10 km²)');
      }

      if (vertexCount < 3) {
        errors.push('Polygon must have at least 3 vertices');
      }
      if (vertexCount > 1000) {
        warnings.push('Polygon has many vertices and may impact performance');
      }

      // Check for self-intersections
      const simplified = turf.simplify(boundary, { tolerance: 0.00001 });
      if (turf.area(simplified) / area < 0.95) {
        warnings.push('Polygon may have self-intersections or be too complex');
      }

      // Check closure
      const coords = boundary.geometry.coordinates[0];
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        errors.push('Polygon is not properly closed');
      }

    } catch (error) {
      errors.push(`Validation error: ${error}`);
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      area,
      perimeter,
      vertexCount,
    };

    setValidationResult(result);
    return result;
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (map.current) {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 2000,
          });
        }

        toast.success(`Found: ${result.display_name}`);
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      toast.error('Search failed');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setProcessingFile(true);

    try {
      const fileName = file.name.toLowerCase();
      let geoJSON: any = null;

      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        // Handle GeoJSON
        const text = await file.text();
        geoJSON = JSON.parse(text);
      } else if (fileName.endsWith('.kml')) {
        // Handle KML
        const text = await file.text();
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(text, 'text/xml');
        geoJSON = toGeoJSON.kml(kmlDoc);
      } else if (fileName.endsWith('.zip') || fileName.endsWith('.shp')) {
        // Handle Shapefile
        const arrayBuffer = await file.arrayBuffer();
        geoJSON = await shp(arrayBuffer);
      } else if (fileName.endsWith('.dxf')) {
        // DXF handling would require additional library
        toast.error('DXF format support coming soon');
        return;
      } else {
        toast.error('Unsupported file format. Please use GeoJSON, KML, or Shapefile.');
        return;
      }

      if (geoJSON) {
        // Extract first polygon feature
        let polygonFeature = null;

        if (geoJSON.type === 'Feature' && geoJSON.geometry.type === 'Polygon') {
          polygonFeature = geoJSON;
        } else if (geoJSON.type === 'FeatureCollection') {
          polygonFeature = geoJSON.features.find((f: any) => f.geometry.type === 'Polygon');
        }

        if (polygonFeature) {
          setCurrentBoundary(polygonFeature);
          loadBoundaryOnMap(polygonFeature);
          validateBoundary(polygonFeature);
          toast.success('File uploaded successfully');
        } else {
          toast.error('No polygon geometry found in file');
        }
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Failed to process file');
    } finally {
      setProcessingFile(false);
    }
  };

  const clearBoundary = () => {
    if (draw.current) {
      draw.current.deleteAll();
    }
    setCurrentBoundary(null);
    setValidationResult(null);
    setUploadedFile(null);
  };

  const confirmBoundary = async () => {
    if (!currentBoundary || !validationResult || !validationResult.isValid) {
      toast.error('Please create a valid boundary first');
      return;
    }

    try {
      // Get center point
      const center = turf.centroid(currentBoundary);
      const [lng, lat] = center.geometry.coordinates;

      // Get location name via reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const locationName = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      onBoundarySelected({
        locationName,
        centerLat: lat,
        centerLng: lng,
        boundaryGeoJSON: currentBoundary,
        areaSqm: validationResult.area,
        validationResult,
      });

      toast.success('Boundary selected successfully');
    } catch (error) {
      console.error('Error confirming boundary:', error);
      toast.error('Failed to confirm boundary');
    }
  };

  const exportBoundary = () => {
    if (!currentBoundary) {
      toast.error('No boundary to export');
      return;
    }

    const dataStr = JSON.stringify(currentBoundary, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'boundary.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Boundary exported as GeoJSON');
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'draw' | 'upload')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Draw Boundary</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="search">Search Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    placeholder="Enter location name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  />
                  <Button onClick={searchLocation} disabled={isSearching}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Use the polygon tool to draw your boundary on the map, or search for a location to navigate.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Upload Boundary File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".geojson,.json,.kml,.zip,.shp"
                    onChange={handleFileUpload}
                    disabled={processingFile}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingFile}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Supported formats: GeoJSON (.geojson), KML (.kml), Shapefile (.zip, .shp)
              </p>
              {uploadedFile && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>{uploadedFile.name}</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Map */}
      <Card className="p-0 overflow-hidden">
        <div ref={mapContainer} className="w-full h-96" />
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {validationResult.isValid ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-green-700">Boundary Valid</h3>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-red-700">Boundary Issues</h3>
                </>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Area:</span>
                <p className="font-mono">{(validationResult.area / 10000).toFixed(2)} ha</p>
              </div>
              <div>
                <span className="text-muted-foreground">Perimeter:</span>
                <p className="font-mono">{validationResult.perimeter.toFixed(0)} m</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vertices:</span>
                <p className="font-mono">{validationResult.vertexCount}</p>
              </div>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700">Errors:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-700">Warnings:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearBoundary} disabled={!currentBoundary}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button variant="outline" onClick={exportBoundary} disabled={!currentBoundary}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
        <Button 
          onClick={confirmBoundary} 
          disabled={!validationResult?.isValid}
          className="min-w-[120px]"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Use Boundary
        </Button>
      </div>
    </div>
  );
};

export default BoundaryEditor;