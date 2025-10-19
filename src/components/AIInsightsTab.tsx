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
    if (!mapContainer.current || !selectedSite || mapInitialized) return;

    const bbox = selectedSite.bounding_box;
    if (!bbox) return;

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

      // Add site boundary
      const boundaryCoords = selectedSite.location_data?.boundary_coordinates || [];
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
    if (!query.trim() || !selectedSite || !map.current) return;

    setIsLoading(true);

    try {
      const boundaryCoords = selectedSite.location_data?.boundary_coordinates || [];
      
      const siteBoundary = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [boundaryCoords],
        },
        properties: {},
      };

      const { data, error } = await supabase.functions.invoke("ai-geospatial-query", {
        body: {
          userQuery: query,
          siteBoundary,
        },
      });

      if (error) throw error;

      console.log("AI Query Result:", data);

      // Remove previous AI layers
      const existingLayers = map.current?.getStyle()?.layers || [];
      existingLayers.forEach((layer) => {
        if (layer.id.startsWith("ai-results-")) {
          map.current?.removeLayer(layer.id);
        }
      });

      const existingSources = Object.keys(map.current?.getStyle()?.sources || {});
      existingSources.forEach((sourceId) => {
        if (sourceId.startsWith("ai-results-")) {
          map.current?.removeSource(sourceId);
        }
      });

      // Add new results to map
      const sourceId = `ai-results-${Date.now()}`;
      const layerId = `ai-layer-${Date.now()}`;

      map.current?.addSource(sourceId, {
        type: "geojson",
        data: data.geojson,
      });

      // Determine if we're dealing with points or polygons
      const firstFeature = data.geojson.features[0];
      const isPolygon = firstFeature?.geometry.type === "Polygon";

      if (isPolygon) {
        // Add polygon layer for areas like parks
        map.current?.addLayer({
          id: `${layerId}-fill`,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#22c55e",
            "fill-opacity": 0.4,
          },
        });

        map.current?.addLayer({
          id: `${layerId}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#16a34a",
            "line-width": 2,
          },
        });
      } else {
        // Add point layer for POIs
        map.current?.addLayer({
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
      toast.error("Failed to process query");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedSite) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a site first</p>
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
              placeholder="Ask about places... e.g., 'Show me all cafes' or 'Find nearby schools'"
              disabled={isLoading}
              className="pl-10"
            />
          </div>
          <Button onClick={handleQuery} disabled={isLoading || !query.trim()}>
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
