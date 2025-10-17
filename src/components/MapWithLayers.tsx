import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { fetchRealMapData } from '@/lib/mapLayerRenderer';
import { useToast } from '@/hooks/use-toast';
import { MapStyleType } from './MapStyleSelector';
import { toast as sonnerToast } from 'sonner';

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

export interface MapWithLayersRef {
  getMap: () => maplibregl.Map | null;
}

export const MapWithLayers = forwardRef<MapWithLayersRef, MapWithLayersProps>(
  ({ siteRequestId, layers, onLayersChange, mapStyle = 'simple' }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [osmLoading, setOsmLoading] = useState(false);
  const [layersAdded, setLayersAdded] = useState(false);
  const { toast } = useToast();

    useImperativeHandle(ref, () => ({
      getMap: () => map.current
    }));

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
        
        fetchOSMData(data);
      } catch (error) {
        console.error('Error loading site data:', error);
        toast({
          title: 'Error loading site',
          description: 'Failed to load site information',
          variant: 'destructive'
        });
        setLoading(false);
      }
    };

    const fetchOSMData = async (siteData: any, retryCount = 0) => {
      const maxRetries = 3;
      setOsmLoading(true);
      
      try {
        console.log(`🔄 Fetching OSM data (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        const realData = await fetchRealMapData(
          siteData.center_lat,
          siteData.center_lng,
          siteData.radius_meters || 500,
          siteData.boundary_geojson
        );
        
        if (realData) {
          console.log('✅ OSM data loaded successfully:', {
            buildings: realData.stats.buildingCount,
            landuse: realData.landuse.features.length,
            transit: realData.stats.transitCount
          });
          
          setMapData(realData);
          setOsmLoading(false);
          
          const greenCount = realData.landuse.features.filter((f: any) => 
            ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'].includes(f.properties?.type)
          ).length;
          const landuseCount = realData.landuse.features.length - greenCount;
          
          onLayersChange(layers.map(layer => {
            switch (layer.type) {
              case 'buildings':
                return { ...layer, objectCount: realData.stats.buildingCount, dataSource: 'OpenStreetMap' };
              case 'landuse':
                return { ...layer, objectCount: landuseCount, dataSource: 'OpenStreetMap' };
              case 'transit':
                return { ...layer, objectCount: realData.stats.transitCount, dataSource: 'OpenStreetMap' };
              case 'green':
                return { ...layer, objectCount: greenCount, dataSource: 'OpenStreetMap' };
              case 'population':
                return { ...layer, objectCount: realData.stats.buildingCount, dataSource: 'Derived' };
              default:
                return layer;
            }
          }));
          
          toast({
            title: '✅ Map data loaded',
            description: `${realData.stats.buildingCount} buildings, ${greenCount} green spaces, ${realData.stats.transitCount} transit stops`,
          });
        }
      } catch (err: any) {
        console.error(`❌ OSM fetch failed (attempt ${retryCount + 1}):`, err);
        
        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          setTimeout(() => fetchOSMData(siteData, retryCount + 1), delay);
        } else {
          setOsmLoading(false);
          toast({
            title: '⚠️ Unable to load map layers',
            description: 'OpenStreetMap is temporarily unavailable. Please try again later.',
            variant: 'destructive'
          });
        }
      }
    };

    useEffect(() => {
      loadSiteData();
    }, [siteRequestId]);

    useEffect(() => {
      if (!mapContainer.current || !siteData) return;

      const getMapStyle = (styleType: MapStyleType) => {
        const baseConfig = { 
          version: 8, 
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
        };
        
        const styles = {
          satellite: {
            ...baseConfig,
            sources: {
              'satellite': {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256
              }
            },
            layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
          },
          simple: {
            ...baseConfig,
            sources: {
              'carto': {
                type: 'raster',
                tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
                tileSize: 256
              }
            },
            layers: [{ id: 'carto', type: 'raster', source: 'carto' }]
          },
          dark: {
            ...baseConfig,
            sources: {
              'dark': {
                type: 'raster',
                tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
                tileSize: 256
              }
            },
            layers: [{ id: 'dark', type: 'raster', source: 'dark' }]
          },
          terrain: {
            ...baseConfig,
            sources: {
              'terrain': {
                type: 'raster',
                tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
                tileSize: 256
              }
            },
            layers: [{ id: 'terrain', type: 'raster', source: 'terrain' }]
          },
          streets: {
            ...baseConfig,
            sources: {
              'streets': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256
              }
            },
            layers: [{ id: 'streets', type: 'raster', source: 'streets' }]
          },
          default: {
            ...baseConfig,
            sources: {
              'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256
              }
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
          }
        };

        return styles[styleType] || styles.default;
      };

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: getMapStyle(mapStyle) as any,
        center: [siteData.center_lng, siteData.center_lat],
        zoom: 15,
        preserveDrawingBuffer: true
      } as any);

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('✅ Map loaded, canvas ready for export');
        setLoading(false);
        
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
              'fill-color': '#8BC34A',
              'fill-opacity': 0.1
            }
          });

          map.current.addLayer({
            id: 'boundary-outline',
            type: 'line',
            source: 'boundary',
            paint: {
              'line-color': '#8BC34A',
              'line-width': 3
            }
          });
        }
        
        // Fetch OSM data after map is fully loaded
        console.log('📡 Starting OSM data fetch...');
        fetchOSMData(siteData);
      });

      return () => {
        map.current?.remove();
        map.current = null;
      };
    }, [siteData, mapStyle]);

    useEffect(() => {
      if (!map.current || !mapData) {
        console.log('⚠️ Cannot add layers yet:', { 
          mapExists: !!map.current, 
          dataExists: !!mapData 
        });
        return;
      }
      
      // Wait for map to be fully loaded before adding layers
      const addLayersWhenReady = () => {
        if (!map.current?.loaded()) {
          console.log('⏳ Waiting for map to load before adding layers...');
          setTimeout(addLayersWhenReady, 100);
          return;
        }
        
        console.log('🗺️ Map ready, adding OSM data layers...');
        addAllLayers();
        setLayersAdded(true);
        console.log('✅ All layers added and ready for toggle');
      };
      
      addLayersWhenReady();
    }, [mapData]);

    const addAllLayers = () => {
      if (!map.current || !mapData) {
        console.warn('Cannot add layers: map or data not ready');
        return;
      }

      console.log('📍 Adding layers with data:', {
        buildings: mapData.buildings.features.length,
        landuse: mapData.landuse.features.length,
        transit: mapData.transit.features.length
      });

      if (mapData.buildings.features.length > 0) {
        if (map.current.getSource('buildings')) {
          (map.current.getSource('buildings') as any).setData(mapData.buildings);
        } else {
          map.current.addSource('buildings', {
            type: 'geojson',
            data: mapData.buildings
          });

          map.current.addLayer({
            id: 'buildings-fill',
            type: 'fill',
            source: 'buildings',
            layout: {
              visibility: 'none'
            },
            paint: {
              'fill-color': '#FFD700',
              'fill-opacity': 0.6
            }
          });

          map.current.addLayer({
            id: 'buildings-layer',
            type: 'line',
            source: 'buildings',
            layout: {
              visibility: 'none'
            },
            paint: {
              'line-color': '#FFA500',
              'line-width': 2
            }
          });
          
          console.log('✅ Buildings layer added');
        }
      }

      const greenTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
      const urbanLanduse = {
        type: 'FeatureCollection',
        features: mapData.landuse.features.filter((f: any) => !greenTypes.includes(f.properties?.type))
      };

      if (urbanLanduse.features.length > 0) {
        if (map.current.getSource('landuse')) {
          (map.current.getSource('landuse') as any).setData(urbanLanduse);
        } else {
          map.current.addSource('landuse', {
            type: 'geojson',
            data: urbanLanduse as any
          });

          map.current.addLayer({
            id: 'landuse-fill',
            type: 'fill',
            source: 'landuse',
            layout: {
              visibility: 'none'
            },
            paint: {
              'fill-color': [
                'match',
                ['get', 'type'],
                'residential', '#FF69B4',
                'commercial', '#4169E1',
                'industrial', '#A9A9A9',
                '#CCCCCC'
              ],
              'fill-opacity': 0.4
            }
          });

          map.current.addLayer({
            id: 'landuse-layer',
            type: 'line',
            source: 'landuse',
            layout: {
              visibility: 'none'
            },
            paint: {
              'line-color': '#999999',
              'line-width': 1
            }
          });
          
          console.log('✅ Landuse layer added');
        }
      }

      const greenSpaces = {
        type: 'FeatureCollection',
        features: mapData.landuse.features.filter((f: any) => greenTypes.includes(f.properties?.type))
      };

      if (greenSpaces.features.length > 0) {
        if (map.current.getSource('green-spaces')) {
          (map.current.getSource('green-spaces') as any).setData(greenSpaces);
        } else {
          map.current.addSource('green-spaces', {
            type: 'geojson',
            data: greenSpaces as any
          });

          map.current.addLayer({
            id: 'green-spaces-fill',
            type: 'fill',
            source: 'green-spaces',
            layout: {
              visibility: 'none'
            },
            paint: {
              'fill-color': '#00FF00',
              'fill-opacity': 0.5
            }
          });

          map.current.addLayer({
            id: 'green-spaces-outline',
            type: 'line',
            source: 'green-spaces',
            layout: {
              visibility: 'none'
            },
            paint: {
              'line-color': '#006400',
              'line-width': 2
            }
          });
          
          console.log('✅ Green spaces layer added');
        }
      }

      if (mapData.transit.features.length > 0) {
        if (map.current.getSource('transit')) {
          (map.current.getSource('transit') as any).setData(mapData.transit);
        } else {
          map.current.addSource('transit', {
            type: 'geojson',
            data: mapData.transit
          });

          map.current.addLayer({
            id: 'transit-layer',
            type: 'circle',
            source: 'transit',
            layout: {
              visibility: 'none'
            },
            paint: {
              'circle-radius': 6,
              'circle-color': '#1E90FF',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF'
            }
          });
          
          console.log('✅ Transit layer added');
        }
      }

      if (mapData.buildings.features.length > 0) {
        const buildingPoints = {
          type: 'FeatureCollection',
          features: mapData.buildings.features.map((f: any) => {
            const coords = f.geometry?.coordinates?.[0];
            if (!coords || !Array.isArray(coords)) return null;
            
            let sumLng = 0, sumLat = 0, count = 0;
            coords.forEach((coord: number[]) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                sumLng += coord[0];
                sumLat += coord[1];
                count++;
              }
            });
            
            if (count === 0) return null;
            
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [sumLng / count, sumLat / count]
              },
              properties: { density: 1 }
            };
          }).filter((f: any) => f !== null)
        };

        if (buildingPoints.features.length > 0) {
          if (map.current.getSource('population')) {
            (map.current.getSource('population') as any).setData(buildingPoints);
          } else {
            map.current.addSource('population', {
              type: 'geojson',
              data: buildingPoints as any
            });

            map.current.addLayer({
              id: 'population-heatmap',
              type: 'heatmap',
              source: 'population',
              layout: {
                visibility: 'none'
              },
              paint: {
                'heatmap-weight': 0.5,
                'heatmap-intensity': 1,
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(33,102,172,0)',
                  0.5, 'rgb(103,169,207)',
                  1, 'rgb(178,24,43)'
                ],
                'heatmap-radius': 20,
                'heatmap-opacity': 0.7
              }
            });
            
            console.log('✅ Population heatmap added');
          }
        }
      }
    };

    useEffect(() => {
      if (!map.current) {
        console.log('⚠️ Map not ready for layer toggle');
        return;
      }

      if (!layersAdded) {
        console.log('⚠️ Layers not added yet, waiting for OSM data...');
        return;
      }

      console.log('🎨 Updating layer visibility:', layers.map(l => `${l.type}:${l.visible}`));

      let changesApplied = 0;

      layers.forEach(layer => {
        const visibility = layer.visible ? 'visible' : 'none';
        const layerIds: string[] = [];
        
        switch (layer.type) {
          case 'buildings':
            layerIds.push('buildings-fill', 'buildings-layer');
            break;
          case 'landuse':
            layerIds.push('landuse-fill', 'landuse-layer');
            break;
          case 'transit':
            layerIds.push('transit-layer');
            break;
          case 'green':
            layerIds.push('green-spaces-fill', 'green-spaces-outline');
            break;
          case 'population':
            layerIds.push('population-heatmap');
            break;
        }
        
        layerIds.forEach(layerId => {
          try {
            if (map.current?.getLayer(layerId)) {
              map.current.setLayoutProperty(layerId, 'visibility', visibility);
              console.log(`✅ ${layerId} → ${visibility}`);
              changesApplied++;
            } else {
              console.warn(`⚠️ Layer not found in map: ${layerId}`);
            }
          } catch (error) {
            console.error(`❌ Error setting visibility for ${layerId}:`, error);
          }
        });
      });

      if (changesApplied > 0) {
        // Force map to repaint
        map.current?.triggerRepaint();
        
        const visibleCount = layers.filter(l => l.visible).length;
        console.log(`✅ Applied ${changesApplied} layer visibility changes, ${visibleCount} layers now visible`);
        
        sonnerToast.success(`${visibleCount} layer${visibleCount !== 1 ? 's' : ''} active`, {
          duration: 1500
        });
      }
    }, [layers, layersAdded]);

    if (!siteData) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/30">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="absolute inset-0" data-map-container />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        
        {osmLoading && !loading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-border/50 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-foreground">Loading map layers...</span>
          </div>
        )}
      </div>
    );
  }
);

MapWithLayers.displayName = 'MapWithLayers';
