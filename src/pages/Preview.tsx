import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayerToggles } from '@/components/LayerToggles';
import { Scene3D } from '@/components/Scene3D';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeoJSONData {
  buildings: any[];
  roads: any[];
  terrain: any[];
}

const Preview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<GeoJSONData>({
    buildings: [],
    roads: [],
    terrain: [],
  });
  const [layers, setLayers] = useState({
    buildings: true,
    roads: true,
    terrain: true,
  });
  const [siteInfo, setSiteInfo] = useState<any>(null);

  useEffect(() => {
    loadPreviewData();
  }, [id]);

  const loadPreviewData = async () => {
    if (!id) return;

    try {
      // Check authentication state
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);

      // Fetch site request info
      const { data: request, error: requestError } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (requestError) {
        console.error('Error fetching request:', requestError);
        throw requestError;
      }

      if (!request) {
        console.error('Site pack not found for id:', id);
        toast.error('Site pack not found');
        navigate('/dashboard');
        return;
      }

      console.log('Loaded site request:', {
        id: request.id,
        user_id: request.user_id,
        client_id: request.client_id,
        status: request.status,
        file_url: request.file_url
      });
      setSiteInfo(request);

      if (request.status !== 'completed' || !request.file_url) {
        toast.error('Site pack not yet completed');
        navigate('/dashboard');
        return;
      }

      // For now, we'll create a simple preview from the boundary
      // In production, you'd fetch and parse the actual GeoJSON files from the ZIP
      
      // Create sample data from request info
      const buildings = request.include_buildings
        ? generateSampleBuildings(request)
        : [];
      
      const roads = request.include_roads
        ? generateSampleRoads(request)
        : [];
      
      const terrain = request.include_terrain
        ? generateSampleTerrain(request)
        : [];

      setGeoData({ buildings, roads, terrain });
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load preview data');
    } finally {
      setLoading(false);
    }
  };

  const generateSampleBuildings = (request: any) => {
    // Generate sample buildings within the AOI for demonstration
    const features = [];
    const { center_lat, center_lng, radius_meters } = request;
    const radiusDeg = radius_meters / 111000;

    for (let i = 0; i < 20; i++) {
      const offsetLat = (Math.random() - 0.5) * radiusDeg;
      const offsetLng = (Math.random() - 0.5) * radiusDeg;
      const lat = center_lat + offsetLat;
      const lng = center_lng + offsetLng;

      const size = 0.0001 * (Math.random() * 2 + 1);
      
      features.push({
        type: 'Feature',
        properties: {
          'building:levels': Math.floor(Math.random() * 5) + 1,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng - size, lat - size],
            [lng + size, lat - size],
            [lng + size, lat + size],
            [lng - size, lat + size],
            [lng - size, lat - size],
          ]],
        },
      });
    }

    return features;
  };

  const generateSampleRoads = (request: any) => {
    // Generate sample roads for demonstration
    const features = [];
    const { center_lat, center_lng, radius_meters } = request;
    const radiusDeg = radius_meters / 111000;

    for (let i = 0; i < 10; i++) {
      const startLat = center_lat + (Math.random() - 0.5) * radiusDeg;
      const startLng = center_lng + (Math.random() - 0.5) * radiusDeg;
      const endLat = center_lat + (Math.random() - 0.5) * radiusDeg;
      const endLng = center_lng + (Math.random() - 0.5) * radiusDeg;

      features.push({
        type: 'Feature',
        properties: { highway: 'residential' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [startLng, startLat],
            [endLng, endLat],
          ],
        },
      });
    }

    return features;
  };

  const generateSampleTerrain = (request: any) => {
    // Generate sample terrain points
    const features = [];
    const { center_lat, center_lng, radius_meters } = request;
    const radiusDeg = radius_meters / 111000;

    for (let i = 0; i < 50; i++) {
      const lat = center_lat + (Math.random() - 0.5) * radiusDeg;
      const lng = center_lng + (Math.random() - 0.5) * radiusDeg;
      const elevation = Math.random() * 50;

      features.push({
        type: 'Feature',
        properties: { elevation },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat, elevation],
        },
      });
    }

    return features;
  };

  const handleToggle = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const aoiBounds = siteInfo ? {
    minLat: siteInfo.center_lat - (siteInfo.radius_meters / 111000),
    maxLat: siteInfo.center_lat + (siteInfo.radius_meters / 111000),
    minLng: siteInfo.center_lng - (siteInfo.radius_meters / 111000),
    maxLng: siteInfo.center_lng + (siteInfo.radius_meters / 111000),
  } : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          {siteInfo && (
            <div className="text-sm text-muted-foreground">
              {siteInfo.location_name}
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Card className="p-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading 3D preview...</p>
          </Card>
        </div>
      ) : (
        <div className="relative h-[calc(100vh-80px)]">
          <div className="absolute top-4 left-4 z-10">
            <LayerToggles layers={layers} onToggle={handleToggle} />
          </div>
          
          <Scene3D
            buildings={geoData.buildings}
            roads={geoData.roads}
            terrain={geoData.terrain}
            layers={layers}
            aoiBounds={aoiBounds}
          />
        </div>
      )}
    </div>
  );
};

export default Preview;
