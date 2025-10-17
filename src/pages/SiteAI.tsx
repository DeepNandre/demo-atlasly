import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProjectSelector from '@/components/ai/ProjectSelector';
import ConversationalAnalysis from '@/components/ConversationalAnalysis';
import { MapWithLayers } from '@/components/MapWithLayers';
import { EnhancedLayerPanel } from '@/components/EnhancedLayerPanel';
import { AnalysisProgressPanel } from '@/components/AnalysisProgressPanel';
import { AnalysisTemplates } from '@/components/AnalysisTemplates';
import { MapStyleSelector, type MapStyleType } from '@/components/MapStyleSelector';
import { MapLayerToggle } from '@/components/MapLayerToggle';
import { Scene3D } from '@/components/Scene3D';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Plus, ChevronDown, Box, Map as MapIcon, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { fetchRealMapData } from '@/lib/mapLayerRenderer';

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
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState<SiteRequest | null>(null);
  const [sites, setSites] = useState<SiteRequest[]>([]);
  const [layers, setLayers] = useState<MapLayer[]>(defaultLayers);
  const [templateQuery, setTemplateQuery] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleType>('simple');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [scene3DData, setScene3DData] = useState<any>(null);
  const [loading3D, setLoading3D] = useState(false);
  const [siteData, setSiteData] = useState<any>(null);

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

  // Load 3D data when switching to 3D view
  useEffect(() => {
    if (viewMode === '3d' && selectedSite && !scene3DData) {
      load3DData();
    }
  }, [viewMode, selectedSite]);

  // Reset 3D data when site changes
  useEffect(() => {
    setScene3DData(null);
  }, [selectedSite]);

  const load3DData = async () => {
    if (!selectedSite) return;
    
    setLoading3D(true);
    try {
      // Fetch site data
      const { data: site, error } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', selectedSite.id)
        .single();

      if (error) throw error;
      setSiteData(site);

      // Fetch OSM data with boundary clipping
      const osmData = await fetchRealMapData(
        site.center_lat,
        site.center_lng,
        site.radius_meters || 500,
        site.boundary_geojson
      );

      if (osmData) {
        setScene3DData({
          buildings: osmData.buildings.features || [],
          roads: osmData.transit.features || [],
          terrain: [], // Terrain data would come from elevation analysis
          aoiBounds: {
            minLat: site.center_lat - 0.005,
            maxLat: site.center_lat + 0.005,
            minLng: site.center_lng - 0.005,
            maxLng: site.center_lng + 0.005,
          }
        });
        
        toast({
          title: '✅ 3D data loaded',
          description: `Loaded ${osmData.buildings.features.length} buildings for 3D visualization`,
        });
      }
    } catch (error) {
      console.error('Error loading 3D data:', error);
      toast({
        title: '❌ Failed to load 3D data',
        description: 'Could not fetch visualization data',
        variant: 'destructive'
      });
    } finally {
      setLoading3D(false);
    }
  };

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const handleLayerCreated = (newLayer: any) => {
    const layerExists = layers.find(l => l.id === newLayer.id);
    
    if (layerExists) {
      setLayers(prevLayers =>
        prevLayers.map(layer =>
          layer.id === newLayer.id ? { ...layer, ...newLayer } : layer
        )
      );
    } else {
      setLayers(prevLayers => [...prevLayers, newLayer]);
    }
  };

  const handleExport = async (format: string) => {
    if (!selectedSite) return;
    
    setExportingFormat(format);
    
    try {
      // Fetch full site data
      const { data: siteData, error: siteError } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', selectedSite.id)
        .single();

      if (siteError || !siteData) {
        throw new Error('Failed to fetch site data');
      }

      if (format === 'geojson') {
        // Export GeoJSON with boundary and metadata
        const boundaryFeature = (siteData.boundary_geojson as any) || {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [siteData.center_lng, siteData.center_lat]
          },
          properties: {}
        };

        const geoJsonExport = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: boundaryFeature.geometry || {
                type: 'Point',
                coordinates: [siteData.center_lng, siteData.center_lat]
              },
              properties: {
                ...(boundaryFeature.properties || {}),
                name: siteData.location_name,
                area_sqm: siteData.area_sqm,
                center_lat: siteData.center_lat,
                center_lng: siteData.center_lng,
                created_at: siteData.created_at
              }
            }
          ]
        };

        const blob = new Blob([JSON.stringify(geoJsonExport, null, 2)], 
          { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteData.location_name.replace(/[^a-z0-9]/gi, '_')}.geojson`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: '✅ Export complete',
          description: `GeoJSON file downloaded successfully`,
        });
        
        setExportDialogOpen(false);
        setExportingFormat(null);
        return;
      } else if (format === 'csv') {
        // Export comprehensive site data as CSV
        const rows = [
          ['Site Information', ''],
          ['Location', siteData.location_name],
          ['Area (m²)', siteData.area_sqm?.toFixed(2) || 'N/A'],
          ['Center Latitude', siteData.center_lat],
          ['Center Longitude', siteData.center_lng],
          ['Status', siteData.status],
          ['Created', new Date(siteData.created_at).toLocaleDateString()],
          [''],
          ['Layer Statistics', ''],
          ['Layer Name', 'Type', 'Object Count', 'Data Source'],
          ...layers.map(l => [
            l.name,
            l.type,
            (l.objectCount || 0).toString(),
            l.dataSource || 'N/A'
          ])
        ];
        
        const csvContent = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteData.location_name.replace(/[^a-z0-9]/gi, '_')}_data.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: '✅ Export complete',
          description: `CSV file downloaded successfully`,
        });
        
        setExportDialogOpen(false);
        setExportingFormat(null);
        return;
      } else if (format === 'pdf') {
        // Generate HTML report and download
        const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Site Analysis Report - ${siteData.location_name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #475569; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background-color: #f1f5f9; font-weight: 600; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-label { color: #64748b; font-size: 14px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1e293b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Site Analysis Report</h1>
  
  <h2>Site Information</h2>
  <table>
    <tr><th>Location</th><td>${siteData.location_name}</td></tr>
    <tr><th>Area</th><td>${(siteData.area_sqm || 0).toFixed(2)} m²</td></tr>
    <tr><th>Center Coordinates</th><td>${siteData.center_lat.toFixed(6)}, ${siteData.center_lng.toFixed(6)}</td></tr>
    <tr><th>Status</th><td>${siteData.status}</td></tr>
    <tr><th>Created</th><td>${new Date(siteData.created_at).toLocaleDateString()}</td></tr>
  </table>

  <h2>Layer Statistics</h2>
  <table>
    <thead>
      <tr>
        <th>Layer</th>
        <th>Type</th>
        <th>Objects</th>
        <th>Data Source</th>
      </tr>
    </thead>
    <tbody>
      ${layers.map(l => `
        <tr>
          <td>${l.name}</td>
          <td>${l.type}</td>
          <td>${l.objectCount || 0}</td>
          <td>${l.dataSource || 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Report generated on ${new Date().toLocaleString()}</p>
    <p>SiteIQ - Intelligent Site Analysis Platform</p>
  </div>
</body>
</html>`;

        const blob = new Blob([htmlReport], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteData.location_name.replace(/[^a-z0-9]/gi, '_')}_report.html`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: '✅ Report downloaded',
          description: 'HTML report downloaded successfully. Open in browser and print to PDF.',
        });
        
        setExportDialogOpen(false);
        setExportingFormat(null);
        return;
      } else if (format === 'dxf') {
        // Generate simple DXF with boundary
        const boundary = (siteData.boundary_geojson as any);
        const coords = boundary?.geometry?.coordinates?.[0] || [[siteData.center_lng, siteData.center_lat]];
        
        let dxfContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
0
LAYER
2
BOUNDARY
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

        // Add boundary polyline
        coords.forEach((coord: number[], i: number) => {
          if (i < coords.length - 1) {
            dxfContent += `0
LINE
8
BOUNDARY
10
${coord[0]}
20
${coord[1]}
30
0.0
11
${coords[i + 1][0]}
21
${coords[i + 1][1]}
31
0.0
`;
          }
        });

        dxfContent += `0
ENDSEC
0
EOF`;

        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteData.location_name.replace(/[^a-z0-9]/gi, '_')}_boundary.dxf`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: '✅ DXF downloaded',
          description: 'Site boundary DXF file downloaded successfully',
        });
        
        setExportDialogOpen(false);
        setExportingFormat(null);
        return;
      }
      
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: '❌ Export failed',
        description: error.message || 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setExportingFormat(null);
    }
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
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Sidebar - Resizable Chat */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full border-r border-border/50 bg-card flex flex-col">
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
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Map - Resizable */}
          <ResizablePanel defaultSize={75} minSize={60}>
            <div className="h-full relative">
              {/* Map Controls - Top Left */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <MapStyleSelector 
                  currentStyle={mapStyle}
                  onStyleChange={setMapStyle}
                />
                <MapLayerToggle 
                  layers={layers}
                  onToggleLayer={handleLayerToggle}
                />
                
                {/* 3D View Toggle */}
                <Button
                  size="sm"
                  variant={viewMode === '3d' ? 'default' : 'outline'}
                  onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
                  className="w-full gap-2"
                >
                  {viewMode === '2d' ? <Box className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                  {viewMode === '2d' ? '3D View' : '2D View'}
                </Button>
              </div>
              
              {/* Export Button - Top Right Corner (above progress) */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Export Site Data</DialogTitle>
                      <DialogDescription>
                        Choose the format for exporting {selectedSite.location_name} data
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-4">
                      <Button
                        variant="outline"
                        onClick={() => handleExport('pdf')}
                        disabled={!!exportingFormat}
                        className="h-20 flex flex-col gap-2"
                      >
                        {exportingFormat === 'pdf' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="text-lg">📄</span>
                        <span className="text-sm">PDF Report</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => handleExport('dxf')}
                        disabled={!!exportingFormat}
                        className="h-20 flex flex-col gap-2"
                      >
                        {exportingFormat === 'dxf' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="text-lg">📐</span>
                        <span className="text-sm">DXF (CAD)</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => handleExport('geojson')}
                        disabled={!!exportingFormat}
                        className="h-20 flex flex-col gap-2"
                      >
                        {exportingFormat === 'geojson' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="text-lg">🗺️</span>
                        <span className="text-sm">GeoJSON</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => handleExport('csv')}
                        disabled={!!exportingFormat}
                        className="h-20 flex flex-col gap-2"
                      >
                        {exportingFormat === 'csv' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="text-lg">📊</span>
                        <span className="text-sm">CSV Data</span>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <AnalysisProgressPanel siteRequestId={selectedSite.id} />
              </div>
              
              {/* Render 2D or 3D View */}
              {viewMode === '2d' ? (
                <MapWithLayers
                  siteRequestId={selectedSite.id}
                  layers={layers}
                  onLayersChange={setLayers}
                  mapStyle={mapStyle}
                />
              ) : loading3D ? (
                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                    <div>
                      <h3 className="text-lg font-semibold">Loading 3D View</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Fetching buildings and terrain data...
                      </p>
                    </div>
                  </div>
                </div>
              ) : scene3DData ? (
                <div className="w-full h-full relative">
                  <Scene3D
                    buildings={scene3DData.buildings}
                    roads={scene3DData.roads}
                    terrain={scene3DData.terrain}
                    layers={{
                      buildings: layers.find(l => l.id === 'buildings')?.visible ?? true,
                      roads: layers.find(l => l.id === 'transit')?.visible ?? true,
                      terrain: true
                    }}
                    aoiBounds={scene3DData.aoiBounds}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('2d')}
                    className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur"
                  >
                    <MapIcon className="w-4 h-4 mr-2" />
                    Back to 2D View
                  </Button>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                  <div className="text-center space-y-4">
                    <Box className="w-16 h-16 mx-auto text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold">No 3D Data</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Unable to load 3D visualization data
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode('2d')}
                        className="mt-4"
                      >
                        <MapIcon className="w-4 h-4 mr-2" />
                        Back to 2D View
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
