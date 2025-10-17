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
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Plus, ChevronDown, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

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
      const { data: siteData, error: siteError } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', selectedSite.id)
        .single();

      if (siteError || !siteData) {
        throw new Error('Failed to fetch site data');
      }

      if (format === 'image' || format === 'pdf') {
        // Wait for map to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the MapLibre canvas directly
        const mapContainer = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
        if (!mapContainer) {
          throw new Error('Map canvas not found');
        }

        // Create a new canvas for export with white background
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = mapContainer.width;
        exportCanvas.height = mapContainer.height;
        const ctx = exportCanvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }

        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw the map canvas
        ctx.drawImage(mapContainer, 0, 0);
        
        if (format === 'image') {
          exportCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${siteData.location_name.replace(/[^a-z0-9]/gi, '_')}_map.png`;
              a.click();
              URL.revokeObjectURL(url);
              
              toast({
                title: '✅ Image exported',
                description: 'Map image downloaded successfully',
              });
              setExportDialogOpen(false);
              setExportingFormat(null);
            }
          }, 'image/png');
          return;
        } else if (format === 'pdf') {
          const imgData = exportCanvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: exportCanvas.width > exportCanvas.height ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = exportCanvas.width;
          const imgHeight = exportCanvas.height;
          const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
          
          const width = imgWidth * ratio;
          const height = imgHeight * ratio;
          const x = (pdfWidth - width) / 2;
          const y = (pdfHeight - height) / 2;
          
          pdf.addImage(imgData, 'PNG', x, y, width, height);
          pdf.save(`${siteData.location_name.replace(/[^a-z0-9]/gi, '_')}_map.pdf`);

          toast({
            title: '✅ PDF exported',
            description: 'Map PDF downloaded successfully',
          });

          setExportDialogOpen(false);
          setExportingFormat(null);
          return;
        }
      } else if (format === 'geojson') {
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
                        onClick={() => handleExport('image')}
                        disabled={!!exportingFormat}
                        className="h-20 flex flex-col gap-2"
                      >
                        {exportingFormat === 'image' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="text-lg">🖼️</span>
                        <span className="text-sm">PNG Image</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleExport('pdf')}
                        disabled={!!exportingFormat}
                        className="h-20 flex flex-col gap-2"
                      >
                        {exportingFormat === 'pdf' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="text-lg">📄</span>
                        <span className="text-sm">PDF Map</span>
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
              
              {/* Map View */}
              <MapWithLayers
                siteRequestId={selectedSite.id}
                layers={layers}
                onLayersChange={setLayers}
                mapStyle={mapStyle}
              />
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
