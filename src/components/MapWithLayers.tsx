import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { fetchRealMapData, getLanduseColor } from '@/lib/mapLayerRenderer';
import { useToast } from '@/hooks/use-toast';
import { MapStyleType } from './MapStyleSelector';

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population' | 'ai-generated';
  objectCount?: number;
  dataSource?: string;
  geojson?: any;
}

interface MapWithLayersProps {
  siteRequestId: string;
  layers: MapLayer[];
  onLayersChange: (layers: MapLayer[]) => void;
  mapStyle?: MapStyleType;
}

export const MapWithLayers = ({ siteRequestId, layers, onLayersChange, mapStyle = 'simple' }: MapWithLayersProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmError, setOsmError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSiteData();
  }, [siteRequestId]);

  const loadSiteData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', siteRequestId)
        .single();

      if (error) throw error;
      setSiteData(data);
      
      // Fetch real OSM data in background - with boundary clipping and error handling
      const loadMapData = async () => {
        setOsmLoading(true);
        setOsmError(null);
        
        try {
          console.log('🔄 Fetching OSM data with boundary clipping...');
          const realData = await fetchRealMapData(
            data.center_lat,
            data.center_lng,
            data.radius_meters || 500,
            data.boundary_geojson // Pass boundary for precise clipping
          );
          
          if (realData) {
            setMapData(realData);
            setOsmLoading(false);
            console.log('✅ Loaded CLIPPED OSM data:', realData.stats);
            
            toast({
              title: '✅ Real data loaded',
              description: `Found ${realData.stats.buildingCount} buildings, ${realData.stats.transitCount} transit stops within boundary`,
            });
            
            // Update layer counts based on real clipped data
            onLayersChange(layers.map(layer => {
              if (layer.type === 'buildings') {
                return { ...layer, objectCount: realData.stats.buildingCount, dataSource: 'OpenStreetMap' };
              }
              if (layer.type === 'transit') {
                return { ...layer, objectCount: realData.stats.transitCount, dataSource: 'OpenStreetMap' };
              }
              if (layer.type === 'green') {
                const greenCount = realData.landuse.features.filter((f: any) => 
                  ['park', 'forest', 'grass', 'meadow'].includes(f.properties?.type)
                ).length;
                return { ...layer, objectCount: greenCount, dataSource: 'OpenStreetMap' };
              }
              return layer;
            }));
          }
        } catch (err: any) {
          console.error('❌ Failed to load OSM data:', err);
          setOsmLoading(false);
          setOsmError(err.message || 'Failed to load map data');
          
          toast({
            title: '⚠️ OpenStreetMap temporarily unavailable',
            description: 'Retrying data fetch. Map layers may take a moment to load.',
            variant: 'default'
          });
          
          // Retry after 3 seconds
          setTimeout(() => loadMapData(), 3000);
        }
      };
      loadMapData();
    } catch (error) {
      console.error('Error loading site data:', error);
      toast({
        title: 'Error loading map data',
        description: 'Using demo data instead',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !siteData) return;

    const getMapStyle = (styleType: MapStyleType) => {
      const baseConfig = { version: 8, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf' };
      
      switch (styleType) {
        case 'satellite':
          return {
            ...baseConfig,
            sources: {
              'satellite': {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256,
                attribution: '© Esri'
              }
            },
            layers: [{ id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 19 }]
          };
        
        case 'simple':
          return {
            ...baseConfig,
            sources: {
              'carto': {
                type: 'raster',
                tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© CARTO'
              }
            },
            layers: [{ id: 'carto', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 19 }]
          };
        
        case 'dark':
          return {
            ...baseConfig,
            sources: {
              'dark': {
                type: 'raster',
                tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© CARTO'
              }
            },
            layers: [{ id: 'dark', type: 'raster', source: 'dark', minzoom: 0, maxzoom: 19 }]
          };
        
        case 'terrain':
          return {
            ...baseConfig,
            sources: {
              'terrain': {
                type: 'raster',
                tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenTopoMap'
              }
            },
            layers: [{ id: 'terrain', type: 'raster', source: 'terrain', minzoom: 0, maxzoom: 17 }]
          };
        
        case 'streets':
          return {
            ...baseConfig,
            sources: {
              'streets': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap'
              }
            },
            layers: [{ id: 'streets', type: 'raster', source: 'streets', minzoom: 0, maxzoom: 19 }]
          };
        
        case 'default':
        default:
          return {
            ...baseConfig,
            sources: {
              'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap'
              }
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
          };
      }
    };

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(mapStyle) as any,
      center: [siteData.center_lng, siteData.center_lat],
      zoom: 15,
      pitch: 0
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setLoading(false);
      
      // Add boundary outline
      if (siteData.boundary_geojson && map.current) {
        map.current.addSource('boundary', {
          type: 'geojson',
          data: siteData.boundary_geojson
        });

        map.current.addLayer({
          id: 'boundary-fill',
          type: 'fill',
          source: 'boundary',
          paint: {
            'fill-color': 'hsl(75, 40%, 35%)',
            'fill-opacity': 0.1
          }
        });

        map.current.addLayer({
          id: 'boundary-outline',
          type: 'line',
          source: 'boundary',
          paint: {
            'line-color': 'hsl(75, 40%, 35%)',
            'line-width': 3
          }
        });
      }

      // Add real data layers when available
      if (mapData) {
        addRealDataLayers();
      }
      
      // Add custom AI-generated layers
      addCustomLayers();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [siteData, mapStyle, mapData]);

  // Function to add custom AI-generated layers
  const addCustomLayers = () => {
    if (!map.current) return;
    
    layers.forEach(layer => {
      if (layer.type === 'ai-generated' && layer.geojson) {
        const sourceId = `custom-${layer.id}`;
        const layerId = `custom-layer-${layer.id}`;
        
        // Remove existing layer and source if they exist
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getLayer(`${layerId}-outline`)) {
          map.current!.removeLayer(`${layerId}-outline`);
        }
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
        
        // Add new source
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: layer.geojson
        });
        
        // Determine layer type from geometry
        const geometryType = layer.geojson.features?.[0]?.geometry?.type;
        
        if (geometryType === 'Point') {
          map.current!.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': 6,
              'circle-color': layer.color,
              'circle-opacity': 0.8,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            },
            layout: {
              visibility: layer.visible ? 'visible' : 'none'
            }
          });
        } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          map.current!.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': layer.color,
              'fill-opacity': 0.4
            },
            layout: {
              visibility: layer.visible ? 'visible' : 'none'
            }
          });
          
          map.current!.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': layer.color,
              'line-width': 2
            },
            layout: {
              visibility: layer.visible ? 'visible' : 'none'
            }
          });
        }
      }
    });
  };

  // Update layer visibility when layers prop changes - OPTIMIZED for instant response
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;

    // Batch all visibility changes for better performance
    requestAnimationFrame(() => {
      layers.forEach(layer => {
        // Map layer types to actual layer IDs
        let layerIds: string[] = [];
        
        switch (layer.type) {
          case 'buildings':
            layerIds = ['buildings-layer', 'buildings-layer-fill'];
            break;
          case 'landuse':
            layerIds = ['landuse-layer', 'landuse-layer-fill'];
            break;
          case 'transit':
            layerIds = ['transit-layer'];
            break;
          case 'green':
            layerIds = ['green-spaces-fill', 'green-spaces-outline'];
            break;
          case 'population':
            layerIds = ['population-heatmap'];
            break;
          case 'ai-generated':
            const customLayerId = `custom-layer-${layer.id}`;
            layerIds = [customLayerId, `${customLayerId}-outline`];
            break;
        }
        
        const visibility = layer.visible ? 'visible' : 'none';
        
        layerIds.forEach(layerId => {
          try {
            if (map.current?.getLayer(layerId)) {
              map.current.setLayoutProperty(layerId, 'visibility', visibility);
            }
          } catch (error) {
            console.warn(`Failed to toggle layer ${layerId}:`, error);
          }
        });
      });
      
      // Re-add custom layers if they don't exist yet
      addCustomLayers();
    });
  }, [layers]);

  const addMockBuildingsLayer = () => {
    if (!map.current || !siteData) return;

    // Mock building data (yellow polygons like AINO)
    const buildings = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [siteData.center_lng - 0.001, siteData.center_lat - 0.001],
              [siteData.center_lng - 0.001, siteData.center_lat + 0.0005],
              [siteData.center_lng - 0.0005, siteData.center_lat + 0.0005],
              [siteData.center_lng - 0.0005, siteData.center_lat - 0.001],
              [siteData.center_lng - 0.001, siteData.center_lat - 0.001]
            ]]
          },
          properties: { height: 12 }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [siteData.center_lng + 0.0005, siteData.center_lat - 0.0005],
              [siteData.center_lng + 0.0005, siteData.center_lat + 0.001],
              [siteData.center_lng + 0.001, siteData.center_lat + 0.001],
              [siteData.center_lng + 0.001, siteData.center_lat - 0.0005],
              [siteData.center_lng + 0.0005, siteData.center_lat - 0.0005]
            ]]
          },
          properties: { height: 8 }
        }
      ]
    };

    map.current.addSource('buildings', {
      type: 'geojson',
      data: buildings as any
    });

    map.current.addLayer({
      id: 'buildings-layer-fill',
      type: 'fill',
      source: 'buildings',
      paint: {
        'fill-color': '#FFD700',
        'fill-opacity': 0.5
      }
    });

    map.current.addLayer({
      id: 'buildings-layer',
      type: 'line',
      source: 'buildings',
      paint: {
        'line-color': '#FFD700',
        'line-width': 2
      }
    });
  };

  const addMockLanduseLayer = () => {
    if (!map.current || !siteData) return;

    // Mock landuse (green for parks, pink for residential)
    const landuse = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [siteData.center_lng - 0.002, siteData.center_lat - 0.002],
              [siteData.center_lng - 0.002, siteData.center_lat - 0.001],
              [siteData.center_lng - 0.001, siteData.center_lat - 0.001],
              [siteData.center_lng - 0.001, siteData.center_lat - 0.002],
              [siteData.center_lng - 0.002, siteData.center_lat - 0.002]
            ]]
          },
          properties: { type: 'park' }
        }
      ]
    };

    map.current.addSource('landuse', {
      type: 'geojson',
      data: landuse as any
    });

    map.current.addLayer({
      id: 'landuse-layer-fill',
      type: 'fill',
      source: 'landuse',
      paint: {
        'fill-color': ['match', ['get', 'type'], 'park', '#00FF00', '#FF69B4'],
        'fill-opacity': 0.3
      }
    });

    map.current.addLayer({
      id: 'landuse-layer',
      type: 'line',
      source: 'landuse',
      paint: {
        'line-color': ['match', ['get', 'type'], 'park', '#00FF00', '#FF69B4'],
        'line-width': 1
      }
    });
  };

  const addRealDataLayers = () => {
    if (!map.current || !mapData) return;

    // Add buildings layer
    if (mapData.buildings.features.length > 0) {
      if (!map.current.getSource('buildings')) {
        map.current.addSource('buildings', {
          type: 'geojson',
          data: mapData.buildings
        });

        map.current.addLayer({
          id: 'buildings-layer-fill',
          type: 'fill',
          source: 'buildings',
          paint: {
            'fill-color': '#FFD700',
            'fill-opacity': 0.5
          }
        });

        map.current.addLayer({
          id: 'buildings-layer',
          type: 'line',
          source: 'buildings',
          paint: {
            'line-color': '#FFA500',
            'line-width': 2
          }
        });
      }
    }

    // Separate green spaces from landuse data
    const greenSpaceTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
    const greenSpaces = {
      type: 'FeatureCollection',
      features: mapData.landuse.features.filter((f: any) => 
        greenSpaceTypes.includes(f.properties?.type)
      )
    };

    const urbanLanduse = {
      type: 'FeatureCollection',
      features: mapData.landuse.features.filter((f: any) => 
        !greenSpaceTypes.includes(f.properties?.type)
      )
    };

    // Add landuse layer (excluding green spaces) - WITH VALIDATION
    if (urbanLanduse.features.length > 0) {
      // Filter out any features with invalid geometry
      const validLanduse = {
        type: 'FeatureCollection',
        features: urbanLanduse.features.filter((f: any) => {
          const coords = f.geometry?.coordinates?.[0];
          return coords && Array.isArray(coords) && coords.length >= 4; // Valid polygon
        })
      };

      if (validLanduse.features.length > 0 && !map.current.getSource('landuse')) {
        map.current.addSource('landuse', {
          type: 'geojson',
          data: validLanduse as any
        });

        map.current.addLayer({
          id: 'landuse-layer-fill',
          type: 'fill',
          source: 'landuse',
          paint: {
            'fill-color': [
              'match',
              ['get', 'type'],
              'residential', '#FF69B4',
              'commercial', '#4169E1',
              'industrial', '#A9A9A9',
              'retail', '#87CEEB',
              'farmland', '#F0E68C',
              '#CCCCCC'
            ],
            'fill-opacity': 0.3
          }
        });

        map.current.addLayer({
          id: 'landuse-layer',
          type: 'line',
          source: 'landuse',
          paint: {
            'line-color': [
              'match',
              ['get', 'type'],
              'residential', '#FF1493',
              'commercial', '#0000CD',
              'industrial', '#696969',
              'retail', '#4682B4',
              'farmland', '#DAA520',
              '#999999'
            ],
            'line-width': 1.5
          }
        });
      }
    }

    // Add green spaces layer
    if (greenSpaces.features.length > 0) {
      if (!map.current.getSource('green-spaces')) {
        map.current.addSource('green-spaces', {
          type: 'geojson',
          data: greenSpaces as any
        });

        map.current.addLayer({
          id: 'green-spaces-fill',
          type: 'fill',
          source: 'green-spaces',
          paint: {
            'fill-color': [
              'match',
              ['get', 'type'],
              'park', '#00FF00',
              'forest', '#228B22',
              'grass', '#90EE90',
              'meadow', '#98FB98',
              'recreation_ground', '#7CFC00',
              'garden', '#ADFF2F',
              '#00FF00'
            ],
            'fill-opacity': 0.5
          }
        });

        map.current.addLayer({
          id: 'green-spaces-outline',
          type: 'line',
          source: 'green-spaces',
          paint: {
            'line-color': '#006400',
            'line-width': 2
          }
        });
      }
    }

    // Add transit layer
    if (mapData.transit.features.length > 0) {
      if (!map.current.getSource('transit')) {
        map.current.addSource('transit', {
          type: 'geojson',
          data: mapData.transit
        });

        map.current.addLayer({
          id: 'transit-layer',
          type: 'circle',
          source: 'transit',
          paint: {
            'circle-radius': 6,
            'circle-color': '#1E90FF',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF'
          }
        });
      }
    }

    // Add population density heatmap (using building density as proxy - NOT real population data)
    if (mapData.buildings.features.length > 0) {
      // Create point data from building centroids with proper validation
      const buildingPoints = {
        type: 'FeatureCollection',
        features: mapData.buildings.features
          .map((f: any) => {
            const coords = f.geometry?.coordinates?.[0];
            if (!coords || !Array.isArray(coords) || coords.length === 0) return null;
            
            // Calculate proper centroid
            let sumLng = 0, sumLat = 0, validPoints = 0;
            coords.forEach((coord: number[]) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                sumLng += coord[0];
                sumLat += coord[1];
                validPoints++;
              }
            });
            
            if (validPoints === 0) return null;
            
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [sumLng / validPoints, sumLat / validPoints]
              },
              properties: {
                // Use building levels/height as density indicator
                density: Math.max(1, f.properties?.levels || f.properties?.height / 3 || 1)
              }
            };
          })
          .filter((f: any) => f !== null)
      };

      if (buildingPoints.features.length > 0 && !map.current.getSource('population')) {
        map.current.addSource('population', {
          type: 'geojson',
          data: buildingPoints as any
        });

        map.current.addLayer({
          id: 'population-heatmap',
          type: 'heatmap',
          source: 'population',
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'density'],
              1, 0.3,
              5, 0.7,
              10, 1
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0.5,
              14, 1,
              16, 1.5
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 10,
              14, 20,
              16, 30
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0.7,
              16, 0.5
            ]
          }
        });
      }
    }
  };

  const addMockTransitLayer = () => {
    if (!map.current || !siteData) return;

    // Mock transit stops (blue circles)
    const transit = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [siteData.center_lng + 0.0015, siteData.center_lat + 0.0015]
          },
          properties: { name: 'Transit Stop 1' }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [siteData.center_lng - 0.0015, siteData.center_lat + 0.001]
          },
          properties: { name: 'Transit Stop 2' }
        }
      ]
    };

    map.current.addSource('transit', {
      type: 'geojson',
      data: transit as any
    });

    map.current.addLayer({
      id: 'transit-layer',
      type: 'circle',
      source: 'transit',
      paint: {
        'circle-radius': 6,
        'circle-color': '#1E90FF',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF'
      }
    });
  };

  if (!siteData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      
      {/* OSM Data Loading Indicator */}
      {osmLoading && !loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-border/50 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-foreground">Loading real map data...</span>
        </div>
      )}
      
      {/* OSM Error Warning */}
      {osmError && !osmLoading && !loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-destructive/10 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-destructive/50 flex items-center gap-2 max-w-md">
          <span className="text-sm text-destructive">⚠️ Using demo data - OpenStreetMap temporarily unavailable</span>
        </div>
      )}
    </div>
  );
};
