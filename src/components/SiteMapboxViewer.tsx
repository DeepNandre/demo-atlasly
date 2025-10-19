import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchRealMapData } from '@/lib/mapLayerRenderer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Layers } from 'lucide-react';
import { generate3dDxf, downloadDxf } from '@/lib/dxfExporter';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  { id: 'roads', name: 'Roads', visible: false, color: '#666666', type: 'population', dataSource: 'OpenStreetMap' },
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
      style: 'mapbox://styles/mapbox/light-v11',
      center: [longitude, latitude],
      zoom: 17.5,
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
              'case',
              // Color by roof shape - pitched roofs get darker colors
              ['==', ['get', 'roofShape'], 'gabled'], '#FF6B00',
              ['==', ['get', 'roofShape'], 'hipped'], '#FF8C00',
              ['==', ['get', 'roofShape'], 'pyramidal'], '#CC5500',
              // Otherwise color by height
              [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                0, '#FFA500',    // Short buildings - bright orange
                30, '#FF8C00',   // Medium buildings - dark orange  
                60, '#FF6B00'    // Tall buildings - red-orange
              ]
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.85,
            'fill-extrusion-ambient-occlusion-intensity': 0.3,
            'fill-extrusion-ambient-occlusion-radius': 3,
            'fill-extrusion-vertical-gradient': true
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

    // Add roads as 3D lines draped on terrain
    if (osmData.roads?.features && osmData.roads.features.length > 0) {
      if (!map.getSource('roads')) {
        map.addSource('roads', {
          type: 'geojson',
          data: osmData.roads
        });

        map.addLayer({
          id: 'roads-line',
          type: 'line',
          source: 'roads',
          paint: {
            'line-color': [
              'match',
              ['get', 'type'],
              'motorway', '#E892A2',
              'trunk', '#F9B29C',
              'primary', '#FCD6A4',
              'secondary', '#F7FABF',
              'tertiary', '#FFFFFF',
              'residential', '#CCCCCC',
              '#999999'
            ],
            'line-width': [
              'match',
              ['get', 'type'],
              'motorway', 6,
              'trunk', 5,
              'primary', 4,
              'secondary', 3,
              'tertiary', 2,
              1.5
            ],
            'line-opacity': 0.8
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: layers.find(l => l.id === 'roads')?.visible ? 'visible' : 'none'
          }
        });
      }
    }

    console.log('[SiteMapboxViewer] OSM layers added');
  };

  // Layer visibility control
  useEffect(() => {
    if (!mapRef.current || !osmData) return;

    const map = mapRef.current;
    
    layers.forEach(layer => {
      const visibility = layer.visible ? 'visible' : 'none';
      
      // Buildings: Control custom building layers
      if (layer.id === 'buildings') {
        if (map.getLayer('osm-buildings-3d')) {
          map.setLayoutProperty('osm-buildings-3d', 'visibility', visibility);
        }
        if (map.getLayer('osm-buildings-outline')) {
          map.setLayoutProperty('osm-buildings-outline', 'visibility', visibility);
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

      // Roads
      if (layer.id === 'roads' && map.getLayer('roads-line')) {
        map.setLayoutProperty('roads-line', 'visibility', visibility);
      }
    });
  }, [layers, osmData]);

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
      case 'roads':
        return osmData.roads?.features?.length || 0;
      default:
        return 0;
    }
  };

  const handleDownloadDxf = () => {
    if (!osmData) {
      toast.error('No site data available to export');
      return;
    }

    try {
      const dxfContent = generate3dDxf(osmData, siteName);
      downloadDxf(dxfContent, siteName);
      toast.success('DXF file downloaded successfully');
    } catch (error) {
      console.error('DXF export error:', error);
      toast.error('Failed to generate DXF file');
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

      {/* Site info card with enhanced styling */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-md p-4 rounded-lg shadow-xl z-10 max-w-xs border-2">
        <h3 className="font-semibold text-base mb-3">{siteName}</h3>
        <div className="text-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#FFA500]"></div>
            <span className="font-medium">{osmData?.stats.buildingCount || 0}</span>
            <span className="text-muted-foreground">Buildings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#32CD32]"></div>
            <span className="font-medium">{osmData?.landuse.features.filter((f: any) => 
              ['park', 'forest', 'grass', 'meadow'].includes(f.properties?.type)
            ).length || 0}</span>
            <span className="text-muted-foreground">Green Spaces</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#1E90FF]"></div>
            <span className="font-medium">{osmData?.stats.transitCount || 0}</span>
            <span className="text-muted-foreground">Transit Stops</span>
          </div>
        </div>
      </div>

      {/* Site Analysis Layers Panel - Always Visible */}
      <Card className="absolute top-4 right-4 z-10 p-0 bg-background/98 backdrop-blur-xl shadow-2xl border-2 border-border/50 min-w-[300px] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-background via-card to-background p-4 border-b border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Site Analysis Layers</h3>
          </div>
          
          {/* Quick actions */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={showAllLayers}
              disabled={loading}
              className="flex-1 h-9 font-medium bg-card hover:bg-card/80"
            >
              All
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={hideAllLayers}
              disabled={loading}
              className="flex-1 h-9 font-medium bg-card hover:bg-card/80"
            >
              None
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Download DXF Button */}
          <Button 
            onClick={handleDownloadDxf}
            disabled={loading || !osmData}
            className="w-full h-12 shadow-sm"
            variant="default"
          >
            <Download className="h-4 w-4 mr-2" />
            Download DXF
          </Button>
          
          {/* Layer toggles */}
          <div className="space-y-2.5">
            {layers.map(layer => {
              const count = getFeatureCount(layer.id);
              return (
                <div 
                  key={layer.id} 
                  className="rounded-lg p-3 bg-card/50 border border-border/50 transition-all duration-200 hover:bg-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Label 
                      htmlFor={`${layer.id}-toggle`} 
                      className="cursor-pointer flex items-center gap-3 flex-1"
                    >
                      <div 
                        className="w-5 h-5 rounded-sm border-2 border-white/30 flex-shrink-0" 
                        style={{ backgroundColor: layer.color }} 
                      />
                      <div className="flex-1">
                        <div className="font-medium text-base">{layer.name}</div>
                        {layer.dataSource && (
                          <div className="text-xs text-muted-foreground mt-0.5">{layer.dataSource}</div>
                        )}
                      </div>
                      <span className="text-base font-semibold text-foreground min-w-[2rem] text-right">
                        {count}
                      </span>
                    </Label>
                    <Switch
                      id={`${layer.id}-toggle`}
                      checked={layer.visible}
                      onCheckedChange={() => toggleLayer(layer.id)}
                      disabled={loading}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
