import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProjectSelector from '@/components/ai/ProjectSelector';
import ConversationalAnalysis from '@/components/ConversationalAnalysis';
import { MapWithLayers } from '@/components/MapWithLayers';
import { MapLayerControls } from '@/components/MapLayerControls';
import { AnalysisTemplates } from '@/components/AnalysisTemplates';
import { Button } from '@/components/ui/button';
import { Plus, Map, MessageSquare, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const SiteIQLogo = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M3 12L6 9L9 12L12 9L15 12L18 9L21 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 16L6 13L9 16L12 13L15 16L18 13L21 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 8L6 5L9 8L12 5L15 8L18 5L21 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface SiteRequest {
  id: string;
  location_name: string;
  created_at: string;
  status: string;
}

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population';
}

const defaultLayers: MapLayer[] = [
  { id: 'buildings', name: 'Buildings', visible: true, color: '#FFD700', type: 'buildings' },
  { id: 'landuse', name: 'Land Use', visible: true, color: '#00FF00', type: 'landuse' },
  { id: 'transit', name: 'Transit', visible: true, color: '#1E90FF', type: 'transit' },
  { id: 'green', name: 'Green Spaces', visible: false, color: '#228B22', type: 'green' },
  { id: 'population', name: 'Population', visible: false, color: '#FF4500', type: 'population' }
];

const SiteAI = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSite, setSelectedSite] = useState<SiteRequest | null>(null);
  const [sites, setSites] = useState<SiteRequest[]>([]);
  const [layers, setLayers] = useState<MapLayer[]>(defaultLayers);
  const [templateQuery, setTemplateQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadUserSites();
  }, [user, navigate]);

  const loadUserSites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('site_requests')
      .select('id, location_name, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading sites:', error);
      return;
    }

    setSites(data || []);
    
    // Auto-select first site if none selected
    if (!selectedSite && data && data.length > 0) {
      setSelectedSite(data[0]);
    }
  };

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const handleTemplateSelect = (query: string) => {
    setTemplateQuery(query);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-medium">
                    <SiteIQLogo className="text-primary-foreground" size={24} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">SiteIQ AI</h1>
                  <p className="text-sm text-muted-foreground">Intelligent Site Analysis</p>
                </div>
              </div>
              
              <div className="hidden lg:block h-8 w-px bg-border"></div>
              
              <div className="hidden lg:flex items-center space-x-3">
                <span className="text-sm font-medium text-muted-foreground">Active Project</span>
                <ProjectSelector
                  sites={sites}
                  selectedSite={selectedSite}
                  onSiteSelect={setSelectedSite}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {selectedSite && (
                <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 capitalize">
                    {selectedSite.status}
                  </span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedSite ? (
        <div className="h-[calc(100vh-4rem)]">
          <ResizablePanelGroup direction="horizontal" className="w-full">
            {/* Left Panel: AI Chat + Templates */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={70} minSize={50}>
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-foreground">AI Assistant</h2>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ask questions about your site
                      </p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <ConversationalAnalysis
                        siteRequestId={selectedSite.id}
                        locationName={selectedSite.location_name}
                        templateQuery={templateQuery}
                        onQueryProcessed={() => setTemplateQuery(null)}
                      />
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                  <AnalysisTemplates onTemplateSelect={handleTemplateSelect} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel: Map */}
            <ResizablePanel defaultSize={65} minSize={50}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={75} minSize={60}>
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Map className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-foreground">Interactive Map</h2>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Visualize site data and layers
                      </p>
                    </div>
                    <div className="flex-1">
                      <MapWithLayers
                        siteRequestId={selectedSite.id}
                        layers={layers}
                        onLayersChange={setLayers}
                      />
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Layer Controls */}
                <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                  <MapLayerControls
                    layers={layers}
                    onLayerToggle={handleLayerToggle}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-lg">
            <div className="relative mx-auto">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-medium">
                <SiteIQLogo className="text-primary" size={48} />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-foreground">Welcome to SiteIQ AI</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Your intelligent site analysis assistant is ready to help. Select a project to get started with insights, recommendations, and visualizations.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button 
                onClick={() => navigate('/generate')}
                size="lg"
                className="w-full sm:w-auto shadow-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>
              
              {sites.length > 0 && (
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedSite(sites[0])}
                  className="w-full sm:w-auto"
                >
                  Use Existing Project
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteAI;
