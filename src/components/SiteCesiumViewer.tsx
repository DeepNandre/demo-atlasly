import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Loader2 } from 'lucide-react';

// Set Cesium ion access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5N2U2NTczNi1jMTk3LTQ1OWMtYjllNC1iZGFhM2E3NWRhYmYiLCJpZCI6MjQxNzU4LCJpYXQiOjE3MzYzMjg5OTF9.z7AKS9Kl4qnK7LqHqCf0nLFLqNYnHk0Tr0w5HBqHq-c';

interface SiteCesiumViewerProps {
  latitude: number;
  longitude: number;
  siteName: string;
  isActive: boolean;
}

export default function SiteCesiumViewer({ latitude, longitude, siteName, isActive }: SiteCesiumViewerProps) {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only initialize if tab is active and we have valid coordinates
    if (!isActive) {
      console.log('[SiteCesiumViewer] Tab not active, waiting...');
      return;
    }

    if (!latitude || !longitude) {
      console.log('[SiteCesiumViewer] No coordinates provided');
      setError('No location coordinates available');
      setLoading(false);
      return;
    }

    if (!cesiumContainerRef.current) {
      console.log('[SiteCesiumViewer] Container not ready');
      return;
    }

    if (viewerRef.current) {
      console.log('[SiteCesiumViewer] Viewer already exists');
      return;
    }

    console.log('[SiteCesiumViewer] Initializing Cesium viewer for:', siteName, latitude, longitude);
    setLoading(true);
    setError(null);

    const initViewer = async () => {
      try {
        // Create terrain provider
        const terrainProvider = await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true
        });

        // Create viewer
        const viewer = new Cesium.Viewer(cesiumContainerRef.current!, {
          terrainProvider,
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
          skyBox: new Cesium.SkyBox({
            sources: {
              positiveX: '',
              negativeX: '',
              positiveY: '',
              negativeY: '',
              positiveZ: '',
              negativeZ: ''
            }
          }),
          skyAtmosphere: new Cesium.SkyAtmosphere()
        });

        // Add OSM Buildings
        const buildingsTileset = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(buildingsTileset);

        // Configure scene
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = true;

        viewerRef.current = viewer;
        console.log('[SiteCesiumViewer] Viewer created successfully');

        // Fly to location
        await viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0.0
          },
          duration: 2
        });

        console.log('[SiteCesiumViewer] Camera positioned');
        setLoading(false);
      } catch (err) {
        console.error('[SiteCesiumViewer] Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize 3D viewer');
        setLoading(false);
      }
    };

    initViewer();

    // Cleanup
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        console.log('[SiteCesiumViewer] Destroying viewer');
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [isActive, latitude, longitude, siteName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Loading 3D view for {siteName}...</p>
          <p className="text-sm text-muted-foreground">Initializing Cesium viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-lg text-destructive">Error loading 3D viewer</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div 
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
