import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface SiteMapboxViewerProps {
  latitude: number;
  longitude: number;
  siteName: string;
}

export default function SiteMapboxViewer({ latitude, longitude, siteName }: SiteMapboxViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('[SiteMapboxViewer] VITE_MAPBOX_TOKEN not configured');
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    console.log('[SiteMapboxViewer] Container is ready. Initializing Mapbox GL JS...');

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
      console.log('[SiteMapboxViewer] Map loaded. Configuring 3D terrain and buildings.');

      map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
      
      map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      map.setConfigProperty('basemap', 'show3dBuildings', true);

      console.log('[SiteMapboxViewer] 3D Terrain and Buildings enabled.');
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

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10">
        <h3 className="font-semibold text-sm mb-2">{siteName}</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🏗️ Global 3D Buildings</p>
          <p>🌍 High-Resolution Terrain</p>
          <p>📍 Powered by Mapbox</p>
        </div>
      </div>
    </div>
  );
}
