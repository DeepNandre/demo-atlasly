import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface AIInsightsTabProps {
  selectedSite: any;
}

interface QueryResult {
  query: string;
  description: string;
  count: number;
  geojson: any;
  timestamp: number;
}

const AIInsightsTab = ({ selectedSite }: AIInsightsTabProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !selectedSite || mapInitialized) {
      console.log('Map init check:', { 
        hasContainer: !!mapContainer.current, 
        hasSite: !!selectedSite, 
        mapInitialized 
      });
      return;
    }

    console.log('Selected site data:', selectedSite);
    
    // Extract bounding box from different possible formats
    let bbox = selectedSite.bounding_box;
    
    // If no bounding_box, try to compute from boundary coordinates
    if (!bbox && selectedSite.location_data?.boundary_coordinates) {
      const coords = selectedSite.location_data.boundary_coordinates;
      const lats = coords.map((c: number[]) => c[1]);
      const lons = coords.map((c: number[]) => c[0]);
      bbox = {
        south: Math.min(...lats),
        north: Math.max(...lats),
        west: Math.min(...lons),
        east: Math.max(...lons)
      };
    }
    
    // If still no bbox, try center_lat/center_lng with default radius
    if (!bbox && selectedSite.center_lat && selectedSite.center_lng) {
      const offset = 0.01; // roughly 1km
      bbox = {
        south: selectedSite.center_lat - offset,
        north: selectedSite.center_lat + offset,
        west: selectedSite.center_lng - offset,
        east: selectedSite.center_lng + offset
      };
    }
    
    if (!bbox) {
      console.error('Could not determine bounding box from site data');
      toast.error('Unable to load map: missing location data');
      return;
    }

    console.log('Using bounding box:', bbox);

    mapboxgl.accessToken = "pk.eyJ1IjoiZGlnZ2Vuc2VzIiwiYSI6ImNtNWdiazM3cDAwdHoya3B6djd4dnAwazMifQ.d0Z_KX-xCElc0uW7g5EHSg";

    const centerLng = (bbox.east + bbox.west) / 2;
    const centerLat = (bbox.north + bbox.south) / 2;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [centerLng, centerLat],
      zoom: 15,
      pitch: 0,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      console.log('Map loaded successfully');

      // Add site boundary - try different data formats
      let boundaryCoords = selectedSite.location_data?.boundary_coordinates || [];
      
      // If no boundary_coordinates in location_data, try boundary_geojson
      if (boundaryCoords.length === 0 && selectedSite.boundary_geojson) {
        try {
          const geojson = typeof selectedSite.boundary_geojson === 'string' 
            ? JSON.parse(selectedSite.boundary_geojson)
            : selectedSite.boundary_geojson;
          
          if (geojson.geometry?.coordinates?.[0]) {
            boundaryCoords = geojson.geometry.coordinates[0];
          }
        } catch (e) {
          console.error('Error parsing boundary_geojson:', e);
        }
      }

      console.log('Boundary coordinates:', boundaryCoords);

      if (boundaryCoords.length > 0) {
        map.current.addSource("site-boundary", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [boundaryCoords],
            },
            properties: {},
          },
        });

        map.current.addLayer({
          id: "site-boundary-fill",
          type: "fill",
          source: "site-boundary",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.1,
          },
        });

        map.current.addLayer({
          id: "site-boundary-line",
          type: "line",
          source: "site-boundary",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        });
      }

      setMapInitialized(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapInitialized(false);
    };
  }, [selectedSite, mapInitialized]);

  const handleQuery = async () => {
    if (!query.trim() || !selectedSite || !map.current || !mapInitialized) {
      toast.error("Please wait for the map to load");
      return;
    }

    setIsLoading(true);
    console.log("Starting AI query:", query);

    try {
      // Get boundary coordinates from different possible formats
      let boundaryCoords = selectedSite.location_data?.boundary_coordinates || [];
      
      if (boundaryCoords.length === 0 && selectedSite.boundary_geojson) {
        try {
          const geojson = typeof selectedSite.boundary_geojson === 'string' 
            ? JSON.parse(selectedSite.boundary_geojson)
            : selectedSite.boundary_geojson;
          
          if (geojson.geometry?.coordinates?.[0]) {
            boundaryCoords = geojson.geometry.coordinates[0];
          }
        } catch (e) {
          console.error('Error parsing boundary for query:', e);
        }
      }
      
      if (boundaryCoords.length === 0) {
        throw new Error("No boundary coordinates available. Please ensure your site has location data.");
      }

      console.log('Using boundary coordinates for query:', boundaryCoords.length, 'points');

      const siteBoundary = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [boundaryCoords],
        },
        properties: {},
      };

      console.log("Sending query to edge function...");

      const { data, error } = await supabase.functions.invoke("ai-geospatial-query", {
        body: {
          userQuery: query,
          siteBoundary,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data || !data.geojson || !data.geojson.features) {
        throw new Error("Invalid response from AI query");
      }

      console.log("AI Query Result:", data);

      // Remove previous AI layers
      if (map.current) {
        const existingLayers = map.current.getStyle()?.layers || [];
        existingLayers.forEach((layer) => {
          if (layer.id.startsWith("ai-results-") || layer.id.startsWith("ai-layer-")) {
            try {
              map.current?.removeLayer(layer.id);
            } catch (e) {
              console.warn("Error removing layer:", e);
            }
          }
        });

        const existingSources = Object.keys(map.current.getStyle()?.sources || {});
        existingSources.forEach((sourceId) => {
          if (sourceId.startsWith("ai-results-")) {
            try {
              map.current?.removeSource(sourceId);
            } catch (e) {
              console.warn("Error removing source:", e);
            }
          }
        });
      }

      // Add new results to map
      const sourceId = `ai-results-${Date.now()}`;
      
      if (!map.current) return;

      map.current.addSource(sourceId, {
        type: "geojson",
        data: data.geojson,
      });

      // Determine if we're dealing with points or polygons
      const firstFeature = data.geojson.features[0];
      if (!firstFeature) {
        toast.info("No results found for your query");
        setIsLoading(false);
        return;
      }

      const geometryType = firstFeature.geometry.type;

      if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
        // Add polygon layer for areas like parks
        const fillLayerId = `ai-layer-fill-${Date.now()}`;
        const lineLayerId = `ai-layer-line-${Date.now()}`;

        map.current.addLayer({
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#22c55e",
            "fill-opacity": 0.4,
          },
        });

        map.current.addLayer({
          id: lineLayerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#16a34a",
            "line-width": 2,
          },
        });

        // Add popup on click
        map.current.on("click", fillLayerId, (e: any) => {
          if (e.features && e.features[0]) {
            const properties = e.features[0].properties;
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold">${properties.name || "Green Space"}</h3>
                  ${properties.leisure ? `<p class="text-sm">Type: ${properties.leisure}</p>` : ""}
                </div>
              `)
              .addTo(map.current!);
          }
        });
      } else {
        // Add point layer for POIs
        const layerId = `ai-layer-${Date.now()}`;

        map.current.addLayer({
          id: layerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": 8,
            "circle-color": "#ef4444",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Add popup on click
        map.current.on("click", layerId, (e: any) => {
          if (e.features && e.features[0]) {
            const properties = e.features[0].properties;
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold">${properties.name || "Point of Interest"}</h3>
                  ${properties.amenity ? `<p class="text-sm">Type: ${properties.amenity}</p>` : ""}
                  ${properties.shop ? `<p class="text-sm">Shop: ${properties.shop}</p>` : ""}
                </div>
              `)
              .addTo(map.current!);
          }
        });

        // Change cursor on hover
        map.current.on("mouseenter", layerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", layerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = "";
        });
      }

      // Add result to history
      const newResult: QueryResult = {
        query,
        description: data.description,
        count: data.count,
        geojson: data.geojson,
        timestamp: Date.now(),
      };

      setResults((prev) => [newResult, ...prev]);
      setQuery("");

      toast.success(`Found ${data.count} ${data.description}`);
    } catch (error) {
      console.error("AI query error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process query");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedSite) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Please select a site first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Map View */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
        
        {/* Results overlay */}
        {results.length > 0 && (
          <div className="absolute top-4 left-4 max-w-sm space-y-2 max-h-[50vh] overflow-y-auto">
            {results.map((result) => (
              <Card key={result.timestamp} className="p-3 bg-background/95 backdrop-blur">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.query}</p>
                    <p className="text-xs text-muted-foreground">
                      Found {result.count} {result.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Query Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isLoading && handleQuery()}
              placeholder="e.g., 'Show me all cafes' or 'Find nearby schools'"
              disabled={isLoading || !mapInitialized}
              className="pl-10"
            />
          </div>
          <Button 
            onClick={handleQuery} 
            disabled={isLoading || !query.trim() || !mapInitialized}
            className="min-w-[44px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Powered by AI • Ask natural language questions about places within your site
        </p>
      </div>
    </div>
  );
};

export default AIInsightsTab;
