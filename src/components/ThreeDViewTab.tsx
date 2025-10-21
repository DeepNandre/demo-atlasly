import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Layers3, 
  Layers, 
  Settings, 
  Eye, 
  EyeOff, 
  Sun, 
  Palette,
  Download,
  RotateCcw
} from 'lucide-react';
import { Scene3D } from './Scene3D';
import { DeckGLScene } from './DeckGLScene';
import { supabase } from '@/integrations/supabase/client';
import { CoordinateProjection } from '@/lib/coordinateUtils';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface ThreeDViewTabProps {
  siteRequestId: string;
  centerLat: number;
  centerLng: number;
}

export const ThreeDViewTab: React.FC<ThreeDViewTabProps> = ({
  siteRequestId,
  centerLat,
  centerLng
}) => {
  const [renderMode, setRenderMode] = useState<'threejs' | 'deckgl'>('threejs');
  const [layers, setLayers] = useState<any[]>([]);
  const [terrainFeatures, setTerrainFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projection, setProjection] = useState<CoordinateProjection | null>(null);
  
  // 3D Settings
  const [settings, setSettings] = useState({
    showWireframe: false,
    terrainOpacity: 1.0,
    buildingOpacity: 1.0,
    showBoundary: true,
    enable3D: true,
    buildingHeightScale: 1.0,
    terrainExaggeration: 1.0,
    shadowsEnabled: true,
    showStats: false
  });

  // Layer visibility
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [layerStyles, setLayerStyles] = useState<Record<string, any>>({});

  // Initialize coordinate projection
  useEffect(() => {
    if (centerLat && centerLng) {
      const proj = new CoordinateProjection(centerLat, centerLng);
      setProjection(proj);
    }
  }, [centerLat, centerLng]);

  // Load site data
  useEffect(() => {
    if (siteRequestId) {
      loadSiteData();
    }
  }, [siteRequestId]);

  const loadSiteData = async () => {
    try {
      setLoading(true);

      // Fetch site request info
      const { data: siteRequest, error: siteError } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', siteRequestId)
        .single();

      if (siteError) throw siteError;

      if (!siteRequest.file_url) {
        toast.error('No data file available for this site');
        return;
      }

      // Download and parse the ZIP file
      const response = await fetch(siteRequest.file_url);
      const blob = await response.blob();
      const zip = await JSZip.loadAsync(blob);

      const layersData: any[] = [];
      const terrainData: any[] = [];

      for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.geojson')) {
          const content = await file.async('text');
          const geojson = JSON.parse(content);
          
          const layerName = filename.replace('.geojson', '').replace(/_/g, ' ');
          
          // Extract terrain features
          if (filename.includes('terrain') || filename.includes('elevation')) {
            if (geojson.features) {
              terrainData.push(...geojson.features);
            }
          }
          
          const layerObj = {
            name: layerName,
            data: geojson,
            visible: true,
            color: getLayerColor(filename)
          };

          layersData.push(layerObj);
        }
      }

      setLayers(layersData);
      setTerrainFeatures(terrainData);

      // Initialize layer visibility
      const visibility: Record<string, boolean> = {};
      const styles: Record<string, any> = {};
      layersData.forEach(layer => {
        visibility[layer.name] = layer.visible;
        styles[layer.name] = {
          color: layer.color,
          opacity: 1.0,
          lineWidth: 2
        };
      });
      setLayerVisibility(visibility);
      setLayerStyles(styles);

    } catch (error) {
      console.error('Error loading site data:', error);
      toast.error('Failed to load site data');
    } finally {
      setLoading(false);
    }
  };

  const getLayerColor = (filename: string): [number, number, number, number] => {
    if (filename.includes('building')) return [231, 76, 60, 200];
    if (filename.includes('road')) return [149, 165, 166, 255];
    if (filename.includes('water')) return [52, 152, 219, 180];
    if (filename.includes('landuse')) return [39, 174, 96, 150];
    if (filename.includes('natural')) return [22, 160, 133, 150];
    if (filename.includes('boundary')) return [255, 107, 107, 255];
    return [155, 89, 182, 150];
  };

  const toggleLayerVisibility = (layerName: string) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetCamera = () => {
    // This would reset the camera position - implementation depends on the specific 3D library
    toast.success('Camera reset');
  };

  const exportView = () => {
    // This would export the current 3D view as an image
    toast.success('Exporting 3D view...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading 3D data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 3D View */}
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          {renderMode === 'threejs' && projection ? (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading 3D Scene...</p>
                </div>
              </div>
            }>
              <Scene3D
                layers={layers}
                terrainFeatures={terrainFeatures}
                projection={projection}
                centerLat={centerLat}
                centerLng={centerLng}
                shadows={{
                  enabled: settings.shadowsEnabled,
                  type: 'pcfSoft',
                  mapSize: 2048
                }}
                settings={{
                  showWireframe: settings.showWireframe,
                  terrainOpacity: settings.terrainOpacity,
                  buildingOpacity: settings.buildingOpacity,
                  showBoundary: settings.showBoundary
                }}
                showStats={settings.showStats}
              />
            </Suspense>
          ) : (
            <DeckGLScene
              layers={layers}
              terrainFeatures={terrainFeatures}
              projection={projection!}
              initialViewState={{
                latitude: centerLat,
                longitude: centerLng,
                zoom: 15,
                pitch: settings.enable3D ? 45 : 0
              }}
              layerVisibility={layerVisibility}
              layerStyles={layerStyles}
              enable3D={settings.enable3D}
              buildingHeightScale={settings.buildingHeightScale}
              terrainExaggeration={settings.terrainExaggeration}
            />
          )}
        </div>

        {/* Render Mode Toggle */}
        <div className="absolute top-4 left-4 z-10">
          <Card className="p-2">
            <Tabs value={renderMode} onValueChange={(value) => setRenderMode(value as 'threejs' | 'deckgl')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="threejs" className="text-xs">
                  <Layers3 className="w-3 h-3 mr-1" />
                  3D
                </TabsTrigger>
                <TabsTrigger value="deckgl" className="text-xs">
                  <Layers className="w-3 h-3 mr-1" />
                  Map
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button size="sm" variant="outline" onClick={resetCamera}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={exportView}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="w-80 bg-card border-l border-border overflow-auto">
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Visualization Settings
            </h3>
          </div>

          <Tabs defaultValue="view" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
            </TabsList>

            <TabsContent value="view" className="space-y-6 mt-4">
              {/* 3D Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">3D Settings</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable3d">Enable 3D</Label>
                  <Switch
                    id="enable3d"
                    checked={settings.enable3D}
                    onCheckedChange={(checked) => updateSetting('enable3D', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="shadows">Shadows</Label>
                  <Switch
                    id="shadows"
                    checked={settings.shadowsEnabled}
                    onCheckedChange={(checked) => updateSetting('shadowsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="wireframe">Wireframe</Label>
                  <Switch
                    id="wireframe"
                    checked={settings.showWireframe}
                    onCheckedChange={(checked) => updateSetting('showWireframe', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="stats">Performance Stats</Label>
                  <Switch
                    id="stats"
                    checked={settings.showStats}
                    onCheckedChange={(checked) => updateSetting('showStats', checked)}
                  />
                </div>
              </div>

              {/* Scale Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Scale Settings</h4>
                
                <div className="space-y-2">
                  <Label>Building Height Scale: {settings.buildingHeightScale.toFixed(1)}x</Label>
                  <Slider
                    value={[settings.buildingHeightScale]}
                    onValueChange={([value]) => updateSetting('buildingHeightScale', value)}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Terrain Exaggeration: {settings.terrainExaggeration.toFixed(1)}x</Label>
                  <Slider
                    value={[settings.terrainExaggeration]}
                    onValueChange={([value]) => updateSetting('terrainExaggeration', value)}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Opacity Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Opacity</h4>
                
                <div className="space-y-2">
                  <Label>Terrain: {Math.round(settings.terrainOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.terrainOpacity]}
                    onValueChange={([value]) => updateSetting('terrainOpacity', value)}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Buildings: {Math.round(settings.buildingOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.buildingOpacity]}
                    onValueChange={([value]) => updateSetting('buildingOpacity', value)}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layers" className="space-y-4 mt-4">
              <h4 className="font-medium">Data Layers</h4>
              
              <div className="space-y-3">
                {layers.map((layer, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ 
                          backgroundColor: `rgba(${layer.color.join(',')})` 
                        }}
                      />
                      <span className="text-sm">{layer.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleLayerVisibility(layer.name)}
                    >
                      {layerVisibility[layer.name] ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ThreeDViewTab;