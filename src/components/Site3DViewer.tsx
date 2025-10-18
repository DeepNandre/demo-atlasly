import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Set Cesium ion access token - Using a more recent public token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5N2U2NTczNi1jMTk3LTQ1OWMtYjllNC1iZGFhM2E3NWRhYmYiLCJpZCI6MjQxNzU4LCJpYXQiOjE3MzYzMjg5OTF9.z7AKS9Kl4qnK7LqHqCf0nLFLqNYnHk0Tr0w5HBqHq-c';

console.log('[Site3DViewer] Cesium ion token configured');

interface Site3DViewerProps {
  siteId: string;
  siteName: string;
}

interface SiteLocation {
  center: {
    lat: number;
    lng: number;
  };
}

export default function Site3DViewer({ siteId, siteName }: Site3DViewerProps) {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerContainerRef.current) {
      console.log('[Site3DViewer] Container not available, retrying...');
      return;
    }

    let viewer: Cesium.Viewer | null = null;
    let mounted = true;

    const initializeViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[Site3DViewer] Starting initialization for site:', siteId);

        // Fetch site location data
        console.log('[Site3DViewer] Fetching site data from edge function...');
        const { data, error: functionError } = await supabase.functions.invoke('get-3d-model-data', {
          body: { siteId }
        });

        if (functionError) {
          console.error('[Site3DViewer] Edge function error:', functionError);
          throw new Error(`Failed to fetch site data: ${functionError.message}`);
        }
        if (!data || !data.center) {
          console.error('[Site3DViewer] Invalid response - no location data');
          throw new Error('Site location data not found');
        }

        const siteLocation: SiteLocation = data;
        console.log('[Site3DViewer] Site location:', siteLocation.center);

        // Create Cesium Viewer with optimized settings
        console.log('[Site3DViewer] Creating Cesium Viewer...');
        
        // First create terrain provider
        console.log('[Site3DViewer] Loading Cesium World Terrain...');
        const terrainProvider = await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true
        });
        console.log('[Site3DViewer] ✓ Cesium World Terrain loaded successfully');

        viewer = new Cesium.Viewer(viewerContainerRef.current, {
          terrainProvider,
          animation: false,
          timeline: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          vrButton: false,
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

        console.log('[Site3DViewer] ✓ Cesium Viewer created');
        viewerRef.current = viewer;

        // Add error handlers
        viewer.scene.renderError.addEventListener((scene, error) => {
          console.error('[Site3DViewer] Cesium render error:', error);
        });

        // Add Cesium OSM Buildings - Global 3D building dataset
        console.log('[Site3DViewer] Loading Cesium OSM Buildings tileset...');
        try {
          const buildingsTileset = await Cesium.createOsmBuildingsAsync();
          viewer.scene.primitives.add(buildingsTileset);
          console.log('[Site3DViewer] ✓ Cesium OSM Buildings tileset added successfully');
          
          // Monitor tile loading progress
          buildingsTileset.tileLoad.addEventListener((tile) => {
            console.log('[Site3DViewer] Building tile loaded');
          });

          buildingsTileset.loadProgress.addEventListener((queuedTileCount, processingTileCount) => {
            const totalLoading = queuedTileCount + processingTileCount;
            if (totalLoading === 0) {
              console.log('[Site3DViewer] ✓ All building tiles loaded');
            } else {
              console.log(`[Site3DViewer] Loading building tiles... ${totalLoading} remaining`);
            }
          });

        } catch (buildingsError) {
          console.error('[Site3DViewer] Failed to load OSM Buildings:', buildingsError);
          throw new Error(`Failed to load 3D buildings: ${buildingsError}`);
        }

        // Configure scene for better visualization
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = true;
        console.log('[Site3DViewer] Scene configured with lighting and depth testing');
        
        // Set camera to site location with proper altitude and angle
        const { lat, lng } = siteLocation.center;
        console.log(`[Site3DViewer] Flying camera to coordinates: ${lat}, ${lng}`);
        
        // Fly to location with increased altitude for better overview
        await viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, 1500), // 1500m altitude for better view
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-30), // 30-degree angle for better building visibility
            roll: 0.0
          },
          duration: 3
        });

        console.log('[Site3DViewer] ✓ Camera positioned successfully');
        console.log('[Site3DViewer] ✓✓✓ Cesium viewer initialized successfully');
        setLoading(false);

      } catch (err) {
        if (!mounted) return;
        
        console.error('[Site3DViewer] ❌ Error initializing 3D viewer:', err);
        console.error('[Site3DViewer] Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace',
          siteId
        });
        setError(err instanceof Error ? err.message : 'Failed to load 3D viewer');
        setLoading(false);
      }
    };

    initializeViewer();

    // Cleanup
    return () => {
      mounted = false;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        console.log('[Site3DViewer] Cleaning up Cesium viewer');
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Loading 3D view for {siteName}...</p>
          <p className="text-sm text-muted-foreground">Streaming global 3D buildings and terrain from Cesium ion...</p>
          <p className="text-xs text-muted-foreground/70">Check browser console for detailed loading status</p>
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
        ref={viewerContainerRef} 
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10">
        <h3 className="font-semibold text-sm mb-2">{siteName}</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🏗️ Global 3D Buildings (Cesium OSM)</p>
          <p>🌍 High-Resolution Terrain</p>
          <p>📍 Real-world accurate positioning</p>
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
