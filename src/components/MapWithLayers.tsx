import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { fetchRealMapData, getLanduseColor } from '@/lib/mapLayerRenderer';
import { useToast } from '@/hooks/use-toast';
import { MapStyleToggle } from './MapStyleToggle';

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population';
}

interface MapWithLayersProps {
  siteRequestId: string;
  layers: MapLayer[];
  onLayersChange: (layers: MapLayer[]) => void;
}

export const MapWithLayers = ({ siteRequestId, layers, onLayersChange }: MapWithLayersProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
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
      
      // Fetch real OSM data in background
      fetchRealMapData(
        data.center_lat,
        data.center_lng,
        data.radius_meters || 500
      ).then(realData => {
        if (realData) {
          setMapData(realData);
          console.log('Loaded map data:', realData.stats);
        }
      }).catch(err => {
        console.warn('Failed to load OSM data, using mock data:', err);
      });
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

    const getMapStyle = (styleType: 'standard' | 'satellite') => {
      if (styleType === 'satellite') {
        return {
          version: 8,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: '© Esri'
            }
          },
          layers: [
            {
              id: 'satellite',
              type: 'raster',
              source: 'satellite',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        };
      } else {
        return {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
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

      // Add real data layers if available, otherwise mock
      if (mapData) {
        addRealDataLayers();
      } else {
        addMockBuildingsLayer();
        addMockLanduseLayer();
        addMockTransitLayer();
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [siteData, mapStyle, mapData]);

  // Handle map style changes
  const handleStyleChange = (newStyle: 'standard' | 'satellite') => {
    setMapStyle(newStyle);
  };

  // Update layer visibility when layers prop changes
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;

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
      }
      
      layerIds.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          map.current.setLayoutProperty(
            layerId,
            'visibility',
            layer.visible ? 'visible' : 'none'
          );
        }
      });
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

    // Add landuse layer (excluding green spaces)
    if (urbanLanduse.features.length > 0) {
      if (!map.current.getSource('landuse')) {
        map.current.addSource('landuse', {
          type: 'geojson',
          data: urbanLanduse as any
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
            'fill-opacity': 0.4
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
            'line-width': 1
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

    // Add population density heatmap (using building density as proxy)
    if (mapData.buildings.features.length > 0) {
      // Create point data from building centroids
      const buildingPoints = {
        type: 'FeatureCollection',
        features: mapData.buildings.features.map((f: any) => {
          // Calculate centroid of polygon
          const coords = f.geometry.coordinates[0];
          if (!coords || coords.length === 0) return null;
          
          const centroid = coords.reduce((acc: number[], coord: number[]) => {
            return [acc[0] + coord[0], acc[1] + coord[1]];
          }, [0, 0]);
          
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [
                centroid[0] / coords.length,
                centroid[1] / coords.length
              ]
            },
            properties: {
              density: f.properties?.levels || 1
            }
          };
        }).filter((f: any) => f !== null)
      };

      if (!map.current.getSource('population')) {
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
              0, 0,
              10, 1
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              15, 3
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
              0, 2,
              15, 20
            ],
            'heatmap-opacity': 0.6
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
      
      <MapStyleToggle style={mapStyle} onStyleChange={handleStyleChange} />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};
