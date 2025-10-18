import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Download, MessageSquare, Sparkles } from 'lucide-react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';

const Preview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [siteInfo, setSiteInfo] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [contextLayers, setContextLayers] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadPreviewData();
    }
  }, [id]);

  const loadPreviewData = async () => {
    try {
      setLoading(true);

      // Fetch site request info
      const { data: siteRequest, error: siteError } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (siteError) throw siteError;
      setSiteInfo(siteRequest);

      if (!siteRequest.file_url) {
        toast.error('No data file available for this site');
        return;
      }

      // Download and parse the ZIP file
      const response = await fetch(siteRequest.file_url);
      const blob = await response.blob();
      const zip = await JSZip.loadAsync(blob);

      // Parse the GeoJSON files and organize layers
      const layersData: any[] = [];
      const contextLayersData: any[] = [];

      for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.geojson')) {
          const content = await file.async('text');
          const geojson = JSON.parse(content);
          
          const layerName = filename.replace('.geojson', '').replace(/_/g, ' ');
          const isContext = filename.includes('_context');
          
          const layerObj = {
            name: layerName,
            data: geojson,
            visible: !isContext,
            color: isContext ? '#888888' : getLayerColor(filename)
          };

          if (isContext) {
            contextLayersData.push(layerObj);
          } else {
            layersData.push(layerObj);
          }
        }
      }

      setLayers(layersData);
      setContextLayers(contextLayersData);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load preview data');
    } finally {
      setLoading(false);
    }
  };

  const getLayerColor = (filename: string): string => {
    if (filename.includes('building')) return '#e74c3c';
    if (filename.includes('road') || filename.includes('railway')) return '#95a5a6';
    if (filename.includes('water')) return '#3498db';
    if (filename.includes('landuse')) return '#27ae60';
    if (filename.includes('natural')) return '#16a085';
    return '#9b59b6';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {loading ? (
        <main className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading project details...</p>
            </div>
          </div>
        </main>
      ) : (
        <main className="container mx-auto px-6 py-12 max-w-5xl">
          <div className="space-y-8">
            {/* Project Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-4xl md:text-5xl font-serif font-bold">
                    {siteInfo?.location_name || 'Site Project'}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Project Overview & Quick Access
                  </p>
                </div>
                <StatusBadge status={siteInfo?.status || 'unknown'} />
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-6 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Area Coverage</h3>
                <p className="text-3xl font-bold">
                  {siteInfo ? (siteInfo.area_sqm / 10000).toFixed(2) : '0'} ha
                </p>
                <p className="text-xs text-muted-foreground">
                  {siteInfo ? `${siteInfo.radius_meters}m radius` : ''}
                </p>
              </Card>

              <Card className="p-6 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Data Layers</h3>
                <p className="text-3xl font-bold">{layers.length}</p>
                <p className="text-xs text-muted-foreground">
                  {contextLayers.length} context layers
                </p>
              </Card>

              <Card className="p-6 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                <p className="text-xl font-semibold">
                  {siteInfo ? new Date(siteInfo.created_at).toLocaleDateString() : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {siteInfo ? new Date(siteInfo.created_at).toLocaleTimeString() : ''}
                </p>
              </Card>
            </div>

            {/* Project Details */}
            <Card className="p-8 space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold">Project Details</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-lg">{siteInfo?.location_name}</p>
                  </div>
                  
                  {siteInfo?.center_lat && siteInfo?.center_lng && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Coordinates</p>
                      <p className="text-lg font-mono text-sm">
                        {siteInfo.center_lat.toFixed(6)}, {siteInfo.center_lng.toFixed(6)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Data Layers</p>
                    <div className="flex flex-wrap gap-2">
                      {layers.slice(0, 5).map((layer, idx) => (
                        <Badge key={idx} variant="secondary">
                          {layer.name}
                        </Badge>
                      ))}
                      {layers.length > 5 && (
                        <Badge variant="outline">+{layers.length - 5} more</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">File Size</p>
                    <p className="text-lg">
                      {siteInfo?.zip_size_bytes 
                        ? `${(siteInfo.zip_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Main Action */}
            <Card className="p-12 text-center space-y-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-serif font-bold">Open in SiteIQ AI</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Access the full AI-powered workspace with interactive maps, solar analysis, 
                  climate data, elevation tools, and conversational AI assistance.
                </p>
              </div>
              
              <Button 
                size="lg"
                onClick={() => navigate(`/site-ai?project=${id}`)}
                className="gap-2 text-lg px-8 py-6 h-auto"
              >
                <MessageSquare className="w-5 h-5" />
                Launch AI Workspace
              </Button>

              <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Interactive Maps
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Solar Analysis
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Climate Data
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  AI Assistant
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 justify-center">
              {siteInfo?.file_url && (
                <Button variant="outline" size="lg" asChild>
                  <a href={siteInfo.file_url} download className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Data Pack
                  </a>
                </Button>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default Preview;
