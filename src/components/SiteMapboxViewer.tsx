import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchRealMapData } from '@/lib/mapLayerRenderer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population';
}

interface SiteMapboxViewerProps {
  latitude: number;
  longitude: number;
  siteName: string;
  boundaryGeojson?: any;
  radiusMeters?: number;
}

const defaultLayers: MapLayer[] = [
  { id: 'buildings', name: 'Buildings', visible: true, color: '#FFD700', type: 'buildings' },
  { id: 'green', name: 'Green Spaces', visible: true, color: '#00FF00', type: 'green' },
  { id: 'transit', name: 'Transit', visible: true, color: '#1E90FF', type: 'transit' },
  { id: 'landuse', name: 'Land Use', visible: false, color: '#FF69B4', type: 'landuse' },
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

      // Add boundary if available
      if (boundaryGeojson) {
        map.addSource('boundary', {
          type: 'geojson',
          data: boundaryGeojson
        });

        map.addLayer({
          id: 'boundary-fill',
          type: 'fill',
          source: 'boundary',
          paint: {
            'fill-color': '#8BC34A',
            'fill-opacity': 0.1
          }
        });

        map.addLayer({
          id: 'boundary-outline',
          type: 'line',
          source: 'boundary',
          paint: {
            'line-color': '#8BC34A',
            'line-width': 3
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

    // Add buildings as 3D extrusions
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
            'fill-extrusion-color': '#FFD700',
            'fill-extrusion-height': [
              'case',
              ['has', 'height'],
              ['get', 'height'],
              15
            ],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.8
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
            'fill-extrusion-color': '#00FF00',
            'fill-extrusion-height': 2,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.6
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

    // Add transit stops as 3D markers
    if (osmData.transit.features.length > 0) {
      if (!map.getSource('transit')) {
        map.addSource('transit', {
          type: 'geojson',
          data: osmData.transit
        });

        map.addLayer({
          id: 'transit-markers',
          type: 'circle',
          source: 'transit',
          paint: {
            'circle-radius': 8,
            'circle-color': '#1E90FF',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF'
          },
          layout: {
            visibility: layers.find(l => l.id === 'transit')?.visible ? 'visible' : 'none'
          }
        });
      }
    }

    console.log('[SiteMapboxViewer] OSM layers added');
  };

  // Update layer visibility
  useEffect(() => {
    if (!mapRef.current || !osmData) return;

    const map = mapRef.current;
    
    layers.forEach(layer => {
      const visibility = layer.visible ? 'visible' : 'none';
      
      if (layer.id === 'buildings' && map.getLayer('osm-buildings-3d')) {
        map.setLayoutProperty('osm-buildings-3d', 'visibility', visibility);
      }
      if (layer.id === 'green' && map.getLayer('green-spaces-fill')) {
        map.setLayoutProperty('green-spaces-fill', 'visibility', visibility);
      }
      if (layer.id === 'landuse' && map.getLayer('landuse-fill')) {
        map.setLayoutProperty('landuse-fill', 'visibility', visibility);
      }
      if (layer.id === 'transit' && map.getLayer('transit-markers')) {
        map.setLayoutProperty('transit-markers', 'visibility', visibility);
      }
    });
  }, [layers, osmData]);

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
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

      {/* Layer toggles */}
      <Card className="absolute top-4 right-4 p-4 bg-background/90 backdrop-blur-sm z-10 space-y-3 min-w-[200px]">
        <h3 className="font-semibold text-sm">3D Layers</h3>
        {layers.map(layer => (
          <div key={layer.id} className="flex items-center justify-between">
            <Label htmlFor={`${layer.id}-toggle`} className="text-sm cursor-pointer flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: layer.color }}
              />
              {layer.name}
            </Label>
            <Switch
              id={`${layer.id}-toggle`}
              checked={layer.visible}
              onCheckedChange={() => toggleLayer(layer.id)}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
