import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Set Cesium ion access token (default public token for development)
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk';

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
    if (!viewerContainerRef.current) return;

    let viewer: Cesium.Viewer | null = null;

    const initializeViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Initializing Cesium viewer for site:', siteId);

        // Fetch site location data
        const { data, error: functionError } = await supabase.functions.invoke('get-3d-model-data', {
          body: { siteId }
        });

        if (functionError) {
          console.error('Function error:', functionError);
          throw functionError;
        }
        if (!data || !data.center) {
          console.error('No location data received');
          throw new Error('No location data available');
        }

        const siteLocation: SiteLocation = data;
        console.log('Site location:', siteLocation.center);

        // Create Cesium Viewer with optimized settings
        viewer = new Cesium.Viewer(viewerContainerRef.current, {
          terrainProvider: await Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true
          }),
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

        viewerRef.current = viewer;

        // Add Cesium OSM Buildings - Global 3D building dataset
        const buildingsTileset = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(buildingsTileset);

        // Configure scene for better visualization
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = true;
        
        // Set camera to site location with proper altitude and angle
        const { lat, lng } = siteLocation.center;
        
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, 800), // 800m altitude
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45), // 45-degree angle looking down
            roll: 0.0
          },
          duration: 3
        });

        console.log('Cesium viewer initialized successfully');
        setLoading(false);

      } catch (err) {
        console.error('Error initializing 3D viewer:', err);
        setError(err instanceof Error ? err.message : 'Failed to load 3D viewer');
        setLoading(false);
      }
    };

    initializeViewer();

    // Cleanup
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
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
          <p className="text-sm text-muted-foreground">Initializing global 3D buildings and terrain...</p>
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
