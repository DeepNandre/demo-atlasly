import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Loader2 } from 'lucide-react';

// Set Cesium ion access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5N2U2NTczNi1jMTk3LTQ1OWMtYjllNC1iZGFhM2E3NWRhYmYiLCJpZCI6MjQxNzU4LCJpYXQiOjE3MzYzMjg5OTF9.z7AKS9Kl4qnK7LqHqCf0nLFLqNYnHk0Tr0w5HBqHq-c';

interface SiteCesiumViewerProps {
  latitude: number;
  longitude: number;
  siteName: string;
}

export default function SiteCesiumViewer({ latitude, longitude, siteName }: SiteCesiumViewerProps) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  // Use a callback ref to ensure the DOM element exists before we initialize Cesium
  const cesiumContainerRef = useCallback((node: HTMLDivElement | null) => {
    // If the node is null (component unmounting) or viewer already exists, do nothing
    if (!node || viewerRef.current) {
      return;
    }

    console.log('[SiteCesiumViewer] Container DOM node is ready. Initializing Cesium Viewer...');

    const initViewer = async () => {
      try {
        const terrainProvider = await Cesium.createWorldTerrainAsync();
        
        const viewer = new Cesium.Viewer(node, {
          terrainProvider,
        // Disable all non-essential UI elements for a clean look
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
      });

        // Add the global 3D buildings layer
        const buildingsTileset = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(buildingsTileset);
        console.log('[SiteCesiumViewer] Cesium OSM Buildings and World Terrain added.');

        // Save the viewer instance to the ref
        viewerRef.current = viewer;

        // Perform the initial camera flight
        console.log(`[SiteCesiumViewer] Performing initial flight to: ${latitude}, ${longitude}`);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-30.0),
          },
        });

      } catch (error) {
        console.error('[SiteCesiumViewer] FATAL: Cesium Viewer initialization failed:', error);
      }
    };

    initViewer();
  }, [latitude, longitude]);

  // This effect handles camera flights when the location props change AFTER initial load
  useEffect(() => {
    if (viewerRef.current && !viewerRef.current.isDestroyed() && latitude && longitude) {
      console.log(`[SiteCesiumViewer] Location changed. Flying to new coordinates: ${latitude}, ${longitude}`);
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-30.0),
        },
      });
    }
  }, [latitude, longitude]);

  // Cleanup effect to destroy the viewer when the component is unmounted
  useEffect(() => {
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        console.log('[SiteCesiumViewer] Component unmounting. Destroying Cesium Viewer.');
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div
        id="cesium-container"
        ref={cesiumContainerRef}
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10">
        <h3 className="font-semibold text-sm mb-2">{siteName}</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🏗️ Global 3D Buildings</p>
          <p>🌍 High-Resolution Terrain</p>
          <p>📍 Real-world positioning</p>
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <p className="font-medium mb-1">Controls:</p>
          <p>• Left drag: Rotate</p>
          <p>• Right drag: Pan</p>
          <p>• Scroll: Zoom</p>
        </div>
      </div>
    </div>
  );
}
