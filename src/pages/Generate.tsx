import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Layers, FileCode, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import MapSelector from '@/components/MapSelector';
import { supabase } from '@/integrations/supabase/client';

const Generate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'location' | 'options' | 'processing'>('location');
  const [siteData, setSiteData] = useState<any>(null);
  const [options, setOptions] = useState({
    buildings: true,
    roads: true,
    landuse: true,
    terrain: true,
    imagery: false,
  });

  const handleBoundarySelected = (data: any) => {
    setSiteData(data);
    setStep('options');
    toast.success('Site boundary confirmed!');
  };

  const handleGenerate = async () => {
    setStep('processing');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please sign in to generate site packs');
        navigate('/auth');
        return;
      }

      const { data: request, error } = await supabase
        .from('site_requests')
        .insert({
          user_id: user.id,
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
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Site pack request created! Processing will begin shortly.');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating site request:', error);
      toast.error(error.message || 'Failed to create site pack request');
      setStep('options');
    }
  };

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

          {/* Step Content */}
          {step === 'location' && (
            <MapSelector onBoundarySelected={handleBoundarySelected} />
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

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Site Summary</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Location: {siteData?.locationName}</p>
                  <p>Area: {(siteData?.areaSqm / 10000).toFixed(2)} hectares</p>
                  <p>Radius: {siteData?.radiusMeters}m</p>
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
              <h2 className="text-3xl font-serif font-semibold">Processing Your Request</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your site pack is being generated. You'll be redirected to your dashboard where
                you can track the progress and download your files when ready.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Generate;
