import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Layers, FileCode, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import MapSelector from '@/components/MapSelector';
import { BoundaryEditor } from '@/components/BoundaryEditor';
import { supabase } from '@/integrations/supabase/client';
import { getClientId } from '@/lib/clientId';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageTracking } from '@/hooks/useUsageTracking';

const Generate = () => {
  const navigate = useNavigate();
  const { subscription, canCreateSite, getRemainingQuota, getTierDisplayName } = useSubscription();
  const { trackFeatureUsage } = useUsageTracking();
  const [step, setStep] = useState<'location' | 'options' | 'processing'>('location');
  const [siteData, setSiteData] = useState<any>(null);
  const [boundaryMode, setBoundaryMode] = useState<'simple' | 'advanced'>('simple');
  const [options, setOptions] = useState({
    buildings: true,
    roads: true,
    landuse: true,
    terrain: true,
    imagery: false,
    dxf: false,
    glb: false,
    dwg: false,
    skp: false,
    pdf: false,
  });
  const [requestId, setRequestId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('pending');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBoundarySelected = (data: any) => {
    setSiteData(data);
    setStep('options');
    toast.success('Site boundary confirmed!');
  };

  const handleGenerate = async () => {
    // Check subscription limits
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && subscription && !canCreateSite()) {
      toast.error(`You've reached your monthly limit of ${subscription.features_enabled.max_site_packs_per_month} site packs. Upgrade to create more!`);
      return;
    }

    setStep('processing');

    try {
      // Get or generate client ID for guest users
      const clientId = user ? null : getClientId();

      const { data: request, error } = await supabase
        .from('site_requests')
        .insert({
          user_id: user?.id || null,
          client_id: clientId,
          location_name: siteData.locationName,
          center_lat: siteData.centerLat,
          center_lng: siteData.centerLng,
          boundary_geojson: siteData.boundaryGeoJSON,
          radius_meters: siteData.radiusMeters,
          area_sqm: siteData.areaSqm,
          include_buildings: options.buildings,
          include_roads: options.roads,
          include_landuse: options.landuse,
          include_terrain: options.terrain,
          include_imagery: options.imagery,
          include_dxf: options.dxf,
          include_glb: options.glb,
          exports_dwg: options.dwg,
          exports_skp: options.skp,
          exports_pdf: options.pdf,
          status: 'pending',
          progress: 0,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Site request created:', request);
      setRequestId(request.id);

      // Track usage
      await trackFeatureUsage('site_pack_generation', request.id, {
        location: siteData.locationName,
        area_sqm: siteData.areaSqm,
        options: options,
      });

      // Start processing
      const response = await supabase.functions.invoke('process-site-request', {
        body: { requestId: request.id },
      });

      if (response.error) {
        console.error('Error starting processing:', response.error);
        toast.error('Failed to start processing. Please try again.');
        return;
      }

      toast.success('Processing started! Your site pack is being generated...');
    } catch (error: any) {
      console.error('Error creating site request:', error);
      toast.error(error.message || 'Failed to create site pack request');
      setStep('options');
    }
  };

  // Poll for status updates
  useEffect(() => {
    if (!requestId || status === 'completed' || status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('site_requests')
        .select('status, progress, file_url, error_message')
        .eq('id', requestId)
        .single();

      if (error) {
        console.error('Error polling status:', error);
        return;
      }

      if (data) {
        setStatus(data.status);
        setProgress(data.progress || 0);
        setDownloadUrl(data.file_url);
        setErrorMessage(data.error_message);

        if (data.status === 'completed') {
          toast.success('Your site pack is ready for download!');
        } else if (data.status === 'failed') {
          toast.error(data.error_message || 'Processing failed');
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [requestId, status]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-serif font-bold">
              Generate Site Pack
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select your site location and configure export options to generate a complete
              architectural site pack with GIS layers, terrain data, and 3D models.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4">
            <div
              className={`flex items-center gap-2 ${
                step === 'location' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                1
              </div>
              <span className="font-medium">Location</span>
            </div>
            <div className="w-12 h-0.5 bg-border" />
            <div
              className={`flex items-center gap-2 ${
                step === 'options' || step === 'processing'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                2
              </div>
              <span className="font-medium">Options</span>
            </div>
            <div className="w-12 h-0.5 bg-border" />
            <div
              className={`flex items-center gap-2 ${
                step === 'processing' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                3
              </div>
              <span className="font-medium">Generate</span>
            </div>
          </div>

          {/* Quota Warning */}
          {subscription && getRemainingQuota() <= 2 && getRemainingQuota() > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have {getRemainingQuota()} site pack{getRemainingQuota() !== 1 ? 's' : ''} remaining this month on your {getTierDisplayName(subscription.tier)} plan.
              </AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          {step === 'location' && (
            <Card className="p-6 space-y-6">
              <Tabs value={boundaryMode} onValueChange={(v) => setBoundaryMode(v as 'simple' | 'advanced')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simple">Simple Circle</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Boundary</TabsTrigger>
                </TabsList>
                <TabsContent value="simple" className="mt-6">
                  <MapSelector onBoundarySelected={handleBoundarySelected} />
                </TabsContent>
                <TabsContent value="advanced" className="mt-6">
                  <BoundaryEditor onBoundaryConfirmed={handleBoundarySelected} />
                </TabsContent>
              </Tabs>
            </Card>
          )}

          {step === 'options' && (
            <Card className="p-8 space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold">Export Options</h2>
                <p className="text-muted-foreground">
                  Select which data layers to include in your site pack
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="buildings"
                    checked={options.buildings}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, buildings: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <label htmlFor="buildings" className="font-medium cursor-pointer flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Buildings
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Building footprints from OpenStreetMap
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="roads"
                    checked={options.roads}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, roads: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <label htmlFor="roads" className="font-medium cursor-pointer flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Roads & Streets
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Road network and street data
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="landuse"
                    checked={options.landuse}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, landuse: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <label htmlFor="landuse" className="font-medium cursor-pointer flex items-center gap-2">
                      <FileCode className="w-4 h-4" />
                      Land Use
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Land use classification data
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="terrain"
                    checked={options.terrain}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, terrain: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <label htmlFor="terrain" className="font-medium cursor-pointer flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Terrain Data
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Elevation data from SRTM
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors md:col-span-2">
                  <Checkbox
                    id="imagery"
                    checked={options.imagery}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, imagery: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <label htmlFor="imagery" className="font-medium cursor-pointer flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Aerial Imagery (Optional)
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      High-resolution aerial imagery overlay
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-8">
                <h3 className="text-lg font-serif font-semibold">Export Formats</h3>
                <p className="text-sm text-muted-foreground">
                  Choose additional export formats (GeoJSON is always included)
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="dxf"
                      checked={options.dxf}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, dxf: checked as boolean })
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="dxf" className="font-medium cursor-pointer flex items-center gap-2">
                        <FileCode className="w-4 h-4" />
                        DXF Export
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        AutoCAD compatible format
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="dwg"
                      checked={options.dwg}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, dwg: checked as boolean })
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="dwg" className="font-medium cursor-pointer flex items-center gap-2">
                        <FileCode className="w-4 h-4" />
                        DWG Export
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Native AutoCAD format
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="glb"
                      checked={options.glb}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, glb: checked as boolean })
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="glb" className="font-medium cursor-pointer flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        GLB/3D Model
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        3D model for visualization
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="skp"
                      checked={options.skp}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, skp: checked as boolean })
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="skp" className="font-medium cursor-pointer flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        SKP (SketchUp)
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        SketchUp native format
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors md:col-span-2">
                    <Checkbox
                      id="pdf"
                      checked={options.pdf}
                      onCheckedChange={(checked) =>
                        setOptions({ ...options, pdf: checked as boolean })
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="pdf" className="font-medium cursor-pointer flex items-center gap-2">
                        <FileCode className="w-4 h-4" />
                        PDF 2D Plan
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Top view plan with legend, scale, and north arrow
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Site Summary</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Location: {siteData?.locationName}</p>
                  <p>Area: {(siteData?.areaSqm / 10000).toFixed(2)} hectares</p>
                  {siteData?.radiusMeters && <p>Radius: {siteData.radiusMeters}m</p>}
                  <p>Boundary: {boundaryMode === 'simple' ? 'Circular' : 'Custom Polygon'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep('location')} className="flex-1">
                  Back
                </Button>
                <Button variant="hero" onClick={handleGenerate} className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Generate Site Pack
                </Button>
              </div>
            </Card>
          )}

          {step === 'processing' && (
            <Card className="p-12 text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-serif font-semibold">
                {status === 'completed' ? 'Complete!' : status === 'failed' ? 'Processing Failed' : 'Processing Your Request'}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {status === 'completed'
                  ? 'Your site pack is ready for download!'
                  : status === 'failed'
                  ? errorMessage || 'An error occurred during processing.'
                  : "We're generating your site pack. This may take a few moments..."}
              </p>

              <div className="max-w-md mx-auto space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{progress}% complete</p>
              </div>

              {status === 'completed' && downloadUrl && (
                <div className="flex gap-4">
                  <Button asChild size="lg" variant="hero" className="gap-2">
                    <a href={downloadUrl} download>
                      <Download className="w-4 h-4" />
                      Download Site Pack
                    </a>
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard')}
                    size="lg"
                    variant="outline"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}

              {status === 'failed' && (
                <div className="flex gap-4">
                  <Button onClick={() => setStep('options')} variant="outline">
                    Back to Options
                  </Button>
                  <Button onClick={() => navigate('/dashboard')} variant="outline">
                    View Dashboard
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Generate;
