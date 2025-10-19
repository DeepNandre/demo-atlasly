import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProjectSelector from '@/components/ai/ProjectSelector';
import ConversationalAnalysis from '@/components/ConversationalAnalysis';
import { AnalysisProgressPanel } from '@/components/AnalysisProgressPanel';
import SiteMapboxViewer from '@/components/SiteMapboxViewer';
import { SolarAnalyzerTab } from '@/components/SolarAnalyzerTab';
import { ClimateTab } from '@/components/ClimateTab';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Progress } from '@/components/ui/progress';
import { Plus, Download, Loader2, Sun, CloudRain, Box, MapIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SiteData } from '@/types/site';
import { useToast } from '@/hooks/use-toast';
import { exportMapToPNG, exportMapToPDF, downloadBlob } from '@/utils/mapExport';

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

const SiteAI = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState<SiteRequest | null>(null);
  const [sites, setSites] = useState<SiteRequest[]>([]);
  const [templateQuery, setTemplateQuery] = useState<string | null>(null);
  const [siteData, setSiteData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('model');

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
      .select('id, location_name, created_at, status, center_lat, center_lng')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading sites:', error);
      return;
    }

    setSites(data || []);
  };

  // Load full site data when site is selected
  useEffect(() => {
    if (selectedSite) {
      const loadFullSiteData = async () => {
        const { data, error } = await supabase
          .from('site_requests')
          .select('*')
          .eq('id', selectedSite.id)
          .single();

        if (!error && data) {
          setSiteData(data);
        }
      };
      loadFullSiteData();
    }
  }, [selectedSite]);

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
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Sidebar - Resizable Chat */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full border-r border-border/50 bg-card">
              <ConversationalAnalysis
                siteRequestId={selectedSite.id}
                locationName={selectedSite.location_name}
                templateQuery={templateQuery}
                onQueryProcessed={() => setTemplateQuery(null)}
                activeTab={activeTab}
                siteData={siteData}
                onTemplateSelect={handleTemplateSelect}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Map/Analysis - Resizable */}
          <ResizablePanel defaultSize={75} minSize={60}>
            <Tabs defaultValue="model" className="h-full flex flex-col" onValueChange={(value) => setActiveTab(value)}>
              <div className="px-6 pt-4 pb-2 border-b border-border bg-gradient-to-r from-card/50 via-primary/5 to-card/50">
                <TabsList className="grid w-full grid-cols-3 h-12">
                  <TabsTrigger value="model" className="gap-2 data-[state=active]:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      <span>Site Model</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="solar" className="gap-2 data-[state=active]:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      <span>Solar Analysis</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="climate" className="gap-2 data-[state=active]:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <CloudRain className="w-4 h-4" />
                      <span>Climate Data</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="model" className="flex-1 m-0 relative">
                {siteData ? (
                  <SiteMapboxViewer 
                    latitude={siteData.center_lat}
                    longitude={siteData.center_lng}
                    siteName={selectedSite.location_name}
                    boundaryGeojson={siteData.boundary_geojson}
                    radiusMeters={siteData.radius_meters || 500}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading site data...
                  </div>
                )}
              </TabsContent>

              <TabsContent value="solar" className="flex-1 m-0 p-4 overflow-auto">
                <SolarAnalyzerTab
                  siteId={selectedSite.id}
                  centerLat={siteData?.center_lat || 0}
                  centerLng={siteData?.center_lng || 0}
                />
              </TabsContent>

              <TabsContent value="climate" className="flex-1 m-0 p-4 overflow-auto">
                <ClimateTab
                  siteRequestId={selectedSite.id}
                  centerLat={siteData?.center_lat || 0}
                  centerLng={siteData?.center_lng || 0}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
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
