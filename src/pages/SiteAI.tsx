import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProjectSelector from '@/components/ai/ProjectSelector';
import ConversationalAnalysis from '@/components/ConversationalAnalysis';
import { MapWithLayers } from '@/components/MapWithLayers';
import { EnhancedLayerPanel } from '@/components/EnhancedLayerPanel';
import { AnalysisProgressPanel } from '@/components/AnalysisProgressPanel';
import { AnalysisTemplates } from '@/components/AnalysisTemplates';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population' | 'ai-generated';
  objectCount?: number;
  dataSource?: string;
  geojson?: any;
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

  // Handle auto-selection from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    
    if (projectId && sites.length > 0) {
      const project = sites.find(s => s.id === projectId);
      if (project) {
        setSelectedSite(project);
        // Clean up URL params after selection
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (!selectedSite && sites.length > 0) {
      // Auto-select first site if none selected
      setSelectedSite(sites[0]);
    }
  }, [sites]);

  // Listen for site creation/updates via storage event
  useEffect(() => {
    const handleStorageChange = () => {
      loadUserSites();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also reload when the page regains focus (for same-tab navigation)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  // Refresh sites when navigating to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserSites();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
  };

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const handleLayerCreated = (newLayer: any) => {
    setLayers(prev => {
      const existingLayer = prev.find(l => l.id === newLayer.id);
      if (existingLayer) {
        return prev.map(l => l.id === newLayer.id ? { ...l, ...newLayer } : l);
      }
      return [...prev, newLayer];
    });
  };

  const handleTemplateSelect = (query: string) => {
    setTemplateQuery(query);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Header */}
      <div className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <SiteIQLogo className="text-primary-foreground" size={20} />
                </div>
                <h1 className="text-lg font-semibold text-foreground">SiteIQ AI</h1>
              </div>
              
              {selectedSite && (
                <>
                  <div className="h-6 w-px bg-border"></div>
                  <ProjectSelector
                    sites={sites}
                    selectedSite={selectedSite}
                    onSiteSelect={setSelectedSite}
                  />
                </>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedSite ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - AI Chat */}
          <div className="w-80 border-r border-border/50 bg-card flex flex-col">
            <div className="flex-1 overflow-hidden">
              <ConversationalAnalysis
                siteRequestId={selectedSite.id}
                locationName={selectedSite.location_name}
                templateQuery={templateQuery}
                onQueryProcessed={() => setTemplateQuery(null)}
                onLayerCreated={handleLayerCreated}
              />
            </div>
            
            {/* Templates - Collapsible */}
            <div className="border-t border-border/50">
              <Collapsible>
                <CollapsibleTrigger className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-smooth">
                  <span className="text-sm font-medium text-muted-foreground">Quick Analysis Templates</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border/50">
                  <div className="p-3 max-h-64 overflow-y-auto">
                    <AnalysisTemplates onTemplateSelect={handleTemplateSelect} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Map - Full Width */}
          <div className="flex-1 relative">
            <MapWithLayers
              siteRequestId={selectedSite.id}
              layers={layers}
              onLayersChange={setLayers}
            />
            
            {/* Floating Panels */}
            <div className="absolute top-4 right-4 z-10 space-y-3 max-w-sm">
              <EnhancedLayerPanel
                layers={layers}
                onLayersChange={setLayers}
              />
              <AnalysisProgressPanel siteRequestId={selectedSite.id} />
            </div>
          </div>
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
