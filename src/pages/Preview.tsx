import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayerToggles } from '@/components/LayerToggles';
import { DeckGLScene } from '@/components/DeckGLScene';
import { SiteChat } from '@/components/SiteChat';
import { ClimateViewer } from '@/components/ClimateViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { clipFeaturesToBoundary, validateBoundary } from '@/lib/boundaryClipping';

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
  const [computingClimate, setComputingClimate] = useState(false);

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

      // Download and parse the actual ZIP file
      console.log('Downloading ZIP from:', request.file_url);
      const response = await fetch(request.file_url);
      const blob = await response.blob();
      
      const zip = await JSZip.loadAsync(blob);
      const zipFiles = Object.keys(zip.files);
      console.log('ZIP files found:', zipFiles);

      // Extract GeoJSON files from geojson/ folder
      let buildings: any[] = [];
      let roads: any[] = [];
      let terrain: any[] = [];

      if (request.include_buildings && zip.files['geojson/buildings.geojson']) {
        const buildingsJson = await zip.files['geojson/buildings.geojson'].async('string');
        const buildingsData = JSON.parse(buildingsJson);
        buildings = buildingsData.features || [];
        console.log('Loaded buildings:', buildings.length, 'features');
        if (buildings.length > 0) {
          console.log('Sample building:', buildings[0]);
        }
      } else {
        console.warn('Buildings file not found or not requested');
      }

      if (request.include_roads && zip.files['geojson/roads.geojson']) {
        const roadsJson = await zip.files['geojson/roads.geojson'].async('string');
        const roadsData = JSON.parse(roadsJson);
        roads = roadsData.features || [];
        console.log('Loaded roads:', roads.length, 'features');
        if (roads.length > 0) {
          console.log('Sample road:', roads[0]);
        }
      } else {
        console.warn('Roads file not found or not requested');
      }

      if (request.include_terrain && zip.files['geojson/terrain.geojson']) {
        const terrainJson = await zip.files['geojson/terrain.geojson'].async('string');
        const terrainData = JSON.parse(terrainJson);
        terrain = terrainData.features || [];
        console.log('Loaded terrain points:', terrain.length, 'features');
        if (terrain.length > 0) {
          console.log('Sample terrain point:', terrain[0]);
        }
      } else {
        console.warn('Terrain file not found or not requested');
      }

      console.log('Final data counts (before clipping):', {
        buildings: buildings.length,
        roads: roads.length,
        terrain: terrain.length
      });

      // Calculate AOI bounds for clipping
      const aoiBounds = {
        minLat: request.center_lat - (request.radius_meters / 111000),
        maxLat: request.center_lat + (request.radius_meters / 111000),
        minLng: request.center_lng - (request.radius_meters / 111000),
        maxLng: request.center_lng + (request.radius_meters / 111000),
      };

      console.log('🎯 AOI Bounds for clipping:', {
        center: `(${request.center_lat.toFixed(6)}, ${request.center_lng.toFixed(6)})`,
        radius: `${request.radius_meters}m`,
        bounds: aoiBounds
      });

      // Clip features to boundary
      if (validateBoundary(aoiBounds)) {
        buildings = clipFeaturesToBoundary(buildings, aoiBounds);
        roads = clipFeaturesToBoundary(roads, aoiBounds);
        terrain = clipFeaturesToBoundary(terrain, aoiBounds);
        
        console.log('✂️ After clipping:', {
          buildings: buildings.length,
          roads: roads.length,
          terrain: terrain.length
        });
      } else {
        console.warn('⚠️ Invalid boundary, skipping clipping');
      }

      setGeoData({ buildings, roads, terrain });
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load preview data');
    } finally {
      setLoading(false);
    }
  };


  const handleToggle = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleComputeClimate = async () => {
    if (!id) return;
    
    setComputingClimate(true);
    try {
      const { data, error } = await supabase.functions.invoke('compute-climate', {
        body: { siteRequestId: id }
      });

      if (error) throw error;

      toast.success('Climate data computed successfully');
      
      // Reload site info to get updated climate_summary
      const { data: updatedRequest } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      if (updatedRequest) {
        setSiteInfo(updatedRequest);
      }
    } catch (error) {
      console.error('Error computing climate:', error);
      toast.error('Failed to compute climate data');
    } finally {
      setComputingClimate(false);
    }
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
        <Tabs defaultValue="3d" className="h-[calc(100vh-80px)]">
          <div className="absolute top-4 left-4 z-10">
            <TabsList>
              <TabsTrigger value="3d">3D View</TabsTrigger>
              <TabsTrigger value="climate">Climate</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="3d" className="h-full m-0">
            <div className="relative h-full">
              <div className="absolute top-16 left-4 z-10">
                <LayerToggles layers={layers} onToggle={handleToggle} />
              </div>
              
              <DeckGLScene
                buildings={geoData.buildings}
                roads={geoData.roads}
                terrain={geoData.terrain}
                layers={layers}
                aoiBounds={aoiBounds}
              />
            </div>
          </TabsContent>

          <TabsContent value="climate" className="h-full m-0">
            <div className="container mx-auto p-6 h-full overflow-auto">
              {!siteInfo?.climate_summary ? (
                <Card className="p-12 text-center space-y-4">
                  <h3 className="text-xl font-semibold">Climate Data</h3>
                  <p className="text-muted-foreground">
                    Compute climate analysis for this site based on historical weather data
                  </p>
                  <Button 
                    onClick={handleComputeClimate} 
                    disabled={computingClimate}
                    size="lg"
                  >
                    {computingClimate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Computing...
                      </>
                    ) : (
                      'Compute Climate Data'
                    )}
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold">Climate Analysis</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Data source: {siteInfo.climate_summary.dataSource}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleComputeClimate}
                      disabled={computingClimate}
                    >
                      {computingClimate ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        'Refresh Data'
                      )}
                    </Button>
                  </div>
                  <ClimateViewer climateData={siteInfo.climate_summary} />
                </div>
              )}
            </div>
          </TabsContent>

          <SiteChat
            siteRequestId={id!}
            locationName={siteInfo?.location_name || 'this site'}
          />
        </Tabs>
      )}
    </div>
  );
};

export default Preview;
