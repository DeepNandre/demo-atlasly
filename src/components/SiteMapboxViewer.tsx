import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchRealMapData } from '@/lib/mapLayerRenderer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population';
  dataSource?: string;
}

interface SiteMapboxViewerProps {
  latitude: number;
  longitude: number;
  siteName: string;
  boundaryGeojson?: any;
  radiusMeters?: number;
}

const defaultLayers: MapLayer[] = [
  { id: 'buildings', name: 'Buildings', visible: false, color: '#FFA500', type: 'buildings', dataSource: 'OpenStreetMap' },
  { id: 'green', name: 'Green Spaces', visible: false, color: '#32CD32', type: 'green', dataSource: 'OpenStreetMap' },
  { id: 'transit', name: 'Transit', visible: false, color: '#1E90FF', type: 'transit', dataSource: 'OpenStreetMap' },
  { id: 'landuse', name: 'Land Use', visible: false, color: '#9370DB', type: 'landuse', dataSource: 'OpenStreetMap' },
];

export default function SiteMapboxViewer({ 
  latitude, 
  longitude, 
  siteName, 
  boundaryGeojson,
  radiusMeters = 500 
}: SiteMapboxViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>(defaultLayers);
  const [osmData, setOsmData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nativeBuildingLayerId, setNativeBuildingLayerId] = useState<string | null>(null);

  // Fetch OSM data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('[SiteMapboxViewer] Fetching OSM data...');
        const data = await fetchRealMapData(latitude, longitude, radiusMeters, boundaryGeojson);
        setOsmData(data);
        console.log('[SiteMapboxViewer] OSM data loaded:', data);
      } catch (error) {
        console.error('[SiteMapboxViewer] Failed to fetch OSM data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [latitude, longitude, radiusMeters, boundaryGeojson]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('[SiteMapboxViewer] VITE_MAPBOX_TOKEN not configured');
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    console.log('[SiteMapboxViewer] Initializing Mapbox GL JS...');

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [longitude, latitude],
      zoom: 16.5,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    mapRef.current = map;

    map.on('load', () => {
      console.log('[SiteMapboxViewer] Map loaded. Configuring 3D terrain...');

      // Add 3D terrain
      map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
      
      map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

      // Find and store native building layer after style loads
      map.once('style.load', () => {
        const style = map.getStyle();
        if (style && style.layers) {
          const buildingLayer = style.layers.find((layer: any) => 
            layer.type === 'fill-extrusion' && 
            (layer.id.includes('building') || layer.source === 'composite')
          );
          if (buildingLayer) {
            setNativeBuildingLayerId(buildingLayer.id);
            console.log('[SiteMapboxViewer] Found native building layer:', buildingLayer.id);
          }
        }
      });

      // Add boundary if available with enhanced styling
      if (boundaryGeojson) {
        map.addSource('boundary', {
          type: 'geojson',
          data: boundaryGeojson
        });

        // Outer glow
        map.addLayer({
          id: 'boundary-glow',
          type: 'line',
          source: 'boundary',
          paint: {
            'line-color': '#8BC34A',
            'line-width': 8,
            'line-opacity': 0.3,
            'line-blur': 4
          }
        });

        // Semi-transparent fill
        map.addLayer({
          id: 'boundary-fill',
          type: 'fill',
          source: 'boundary',
          paint: {
            'fill-color': '#8BC34A',
            'fill-opacity': 0.15
          }
        });

        // Main outline
        map.addLayer({
          id: 'boundary-outline',
          type: 'line',
          source: 'boundary',
          paint: {
            'line-color': '#8BC34A',
            'line-width': 4,
            'line-opacity': 0.9
          }
        });
      }

      console.log('[SiteMapboxViewer] 3D Terrain enabled.');
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        console.log('[SiteMapboxViewer] Mapbox instance removed.');
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      console.log(`[SiteMapboxViewer] Flying to: ${latitude}, ${longitude}`);
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 16.5,
        pitch: 60,
        essential: true
      });
    }
  }, [latitude, longitude]);

  // Add OSM data layers when data is available
  useEffect(() => {
    if (!mapRef.current || !osmData) return;
    if (!mapRef.current.loaded()) {
      // Wait for map to load
      mapRef.current.once('load', () => {
        addOSMLayers();
      });
      return;
    }
    
    addOSMLayers();
  }, [osmData]);

  const addOSMLayers = () => {
    if (!mapRef.current || !osmData) return;
    const map = mapRef.current;
    console.log('[SiteMapboxViewer] Adding OSM layers...');

    // Add buildings as enhanced 3D extrusions
    if (osmData.buildings.features.length > 0) {
      if (!map.getSource('osm-buildings')) {
        map.addSource('osm-buildings', {
          type: 'geojson',
          data: osmData.buildings
        });

        map.addLayer({
          id: 'osm-buildings-3d',
          type: 'fill-extrusion',
          source: 'osm-buildings',
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              [
                'case',
                ['has', 'height'],
                ['get', 'height'],
                [
                  'case',
                  ['has', 'levels'],
                  ['*', ['to-number', ['get', 'levels'], 1], 3.5],
                  15
                ]
              ],
              0, '#FFA500',    // Short buildings - bright orange
              30, '#FF8C00',   // Medium buildings - dark orange  
              60, '#FF6B00'    // Tall buildings - red-orange
            ],
            'fill-extrusion-height': [
              'case',
              ['has', 'height'],
              ['get', 'height'],
              [
                'case',
                ['has', 'levels'],
                ['*', ['to-number', ['get', 'levels'], 1], 3.5],
                15
              ]
            ],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.85,
            'fill-extrusion-ambient-occlusion-intensity': 0.3,
            'fill-extrusion-ambient-occlusion-radius': 3
          },
          layout: {
            visibility: layers.find(l => l.id === 'buildings')?.visible ? 'visible' : 'none'
          }
        });

        // Building outlines
        map.addLayer({
          id: 'osm-buildings-outline',
          type: 'line',
          source: 'osm-buildings',
          paint: {
            'line-color': '#FF8C00',
            'line-width': 1,
            'line-opacity': 0.6
          },
          layout: {
            visibility: layers.find(l => l.id === 'buildings')?.visible ? 'visible' : 'none'
          }
        });
      }
    }

    // Add green spaces
    const greenTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
    const greenSpaces = {
      type: 'FeatureCollection',
      features: osmData.landuse.features.filter((f: any) => greenTypes.includes(f.properties?.type))
    };

    if (greenSpaces.features.length > 0) {
      if (!map.getSource('green-spaces')) {
        map.addSource('green-spaces', {
          type: 'geojson',
          data: greenSpaces as any
        });

        map.addLayer({
          id: 'green-spaces-fill',
          type: 'fill-extrusion',
          source: 'green-spaces',
          paint: {
            'fill-extrusion-color': '#32CD32',
            'fill-extrusion-height': 1.5,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.7
          },
          layout: {
            visibility: layers.find(l => l.id === 'green')?.visible ? 'visible' : 'none'
          }
        });

        map.addLayer({
          id: 'green-spaces-outline',
          type: 'line',
          source: 'green-spaces',
          paint: {
            'line-color': '#228B22',
            'line-width': 2,
            'line-opacity': 0.6
          },
          layout: {
            visibility: layers.find(l => l.id === 'green')?.visible ? 'visible' : 'none'
          }
        });
      }
    }

    // Add urban landuse
    const urbanLanduse = {
      type: 'FeatureCollection',
      features: osmData.landuse.features.filter((f: any) => !greenTypes.includes(f.properties?.type))
    };

    if (urbanLanduse.features.length > 0) {
      if (!map.getSource('landuse')) {
        map.addSource('landuse', {
          type: 'geojson',
          data: urbanLanduse as any
        });

        map.addLayer({
          id: 'landuse-fill',
          type: 'fill',
          source: 'landuse',
          paint: {
            'fill-color': [
              'match',
              ['get', 'type'],
              'residential', '#FF69B4',
              'commercial', '#4169E1',
              'industrial', '#A9A9A9',
              '#CCCCCC'
            ],
            'fill-opacity': 0.5
          },
          layout: {
            visibility: layers.find(l => l.id === 'landuse')?.visible ? 'visible' : 'none'
          }
        });
      }
    }

    // Add transit stops with enhanced 3D markers
    if (osmData.transit.features.length > 0) {
      if (!map.getSource('transit')) {
        map.addSource('transit', {
          type: 'geojson',
          data: osmData.transit
        });

        // Outer glow
        map.addLayer({
          id: 'transit-glow',
          type: 'circle',
          source: 'transit',
          paint: {
            'circle-radius': 16,
            'circle-color': '#1E90FF',
            'circle-opacity': 0.2,
            'circle-blur': 0.8
          },
          layout: {
            visibility: layers.find(l => l.id === 'transit')?.visible ? 'visible' : 'none'
          }
        });

        // Main marker
        map.addLayer({
          id: 'transit-markers',
          type: 'circle',
          source: 'transit',
          paint: {
            'circle-radius': 10,
            'circle-color': '#1E90FF',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF',
            'circle-opacity': 0.9
          },
          layout: {
            visibility: layers.find(l => l.id === 'transit')?.visible ? 'visible' : 'none'
          }
        });
      }
    }

    console.log('[SiteMapboxViewer] OSM layers added');
  };

  // Smart layer visibility with native building control
  useEffect(() => {
    if (!mapRef.current || !osmData) return;

    const map = mapRef.current;
    
    layers.forEach(layer => {
      const visibility = layer.visible ? 'visible' : 'none';
      
      // Buildings: control custom + native layers
      if (layer.id === 'buildings') {
        if (map.getLayer('osm-buildings-3d')) {
          map.setLayoutProperty('osm-buildings-3d', 'visibility', visibility);
        }
        if (map.getLayer('osm-buildings-outline')) {
          map.setLayoutProperty('osm-buildings-outline', 'visibility', visibility);
        }
        // Hide native buildings when custom buildings are shown
        if (nativeBuildingLayerId && map.getLayer(nativeBuildingLayerId)) {
          const nativeVisibility = layer.visible ? 'none' : 'visible';
          map.setLayoutProperty(nativeBuildingLayerId, 'visibility', nativeVisibility);
          console.log(`[Native Buildings] ${nativeBuildingLayerId} → ${nativeVisibility}`);
        }
      }
      
      // Green spaces
      if (layer.id === 'green') {
        if (map.getLayer('green-spaces-fill')) {
          map.setLayoutProperty('green-spaces-fill', 'visibility', visibility);
        }
        if (map.getLayer('green-spaces-outline')) {
          map.setLayoutProperty('green-spaces-outline', 'visibility', visibility);
        }
      }
      
      // Landuse
      if (layer.id === 'landuse' && map.getLayer('landuse-fill')) {
        map.setLayoutProperty('landuse-fill', 'visibility', visibility);
      }
      
      // Transit (including glow)
      if (layer.id === 'transit') {
        if (map.getLayer('transit-glow')) {
          map.setLayoutProperty('transit-glow', 'visibility', visibility);
        }
        if (map.getLayer('transit-markers')) {
          map.setLayoutProperty('transit-markers', 'visibility', visibility);
        }
      }
    });
  }, [layers, osmData, nativeBuildingLayerId]);

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const showAllLayers = () => {
    setLayers(prev => prev.map(layer => ({ ...layer, visible: true })));
  };

  const hideAllLayers = () => {
    setLayers(prev => prev.map(layer => ({ ...layer, visible: false })));
  };

  const getFeatureCount = (layerId: string): number => {
    if (!osmData) return 0;
    
    switch (layerId) {
      case 'buildings':
        return osmData.buildings?.features?.length || 0;
      case 'green': {
        const greenTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
        return osmData.landuse?.features?.filter((f: any) => greenTypes.includes(f.properties?.type)).length || 0;
      }
      case 'transit':
        return osmData.transit?.features?.length || 0;
      case 'landuse': {
        const greenTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
        return osmData.landuse?.features?.filter((f: any) => !greenTypes.includes(f.properties?.type)).length || 0;
      }
      default:
        return 0;
    }
  };

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Site info card */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10 max-w-xs">
        <h3 className="font-semibold text-sm mb-2">{siteName}</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🏗️ {osmData?.stats.buildingCount || 0} Buildings</p>
          <p>🌳 {osmData?.landuse.features.filter((f: any) => 
            ['park', 'forest', 'grass', 'meadow'].includes(f.properties?.type)
          ).length || 0} Green Spaces</p>
          <p>🚌 {osmData?.stats.transitCount || 0} Transit Stops</p>
        </div>
      </div>

      {/* Enhanced layer control panel */}
      <Card className="absolute top-4 right-4 p-4 bg-background/95 backdrop-blur-md z-10 space-y-3 min-w-[260px] shadow-xl border-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Site Analysis Layers</h3>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={showAllLayers}
              disabled={loading}
              className="h-7 px-2 text-xs"
            >
              All
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={hideAllLayers}
              disabled={loading}
              className="h-7 px-2 text-xs"
            >
              None
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {layers.map(layer => {
            const count = getFeatureCount(layer.id);
            return (
              <div key={layer.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label 
                    htmlFor={`${layer.id}-toggle`} 
                    className="text-sm cursor-pointer flex items-center gap-2 flex-1"
                  >
                    <div 
                      className="w-4 h-4 rounded-sm border border-white/20 flex-shrink-0" 
                      style={{ backgroundColor: layer.color }} 
                    />
                    <span className="flex-1">{layer.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({count})
                    </span>
                  </Label>
                  <Switch
                    id={`${layer.id}-toggle`}
                    checked={layer.visible}
                    onCheckedChange={() => toggleLayer(layer.id)}
                    disabled={loading}
                  />
                </div>
                {layer.dataSource && (
                  <p className="text-xs text-muted-foreground ml-6">
                    {layer.dataSource}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
