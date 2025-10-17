import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  MoreVertical, 
  Palette, 
  Download, 
  Trash2,
  GripVertical,
  Layers
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface EnhancedLayerPanelProps {
  layers: MapLayer[];
  onLayersChange: (layers: MapLayer[]) => void;
  onExportLayer?: (layerId: string) => void;
}

export const EnhancedLayerPanel = ({ 
  layers, 
  onLayersChange,
  onExportLayer 
}: EnhancedLayerPanelProps) => {
  const [editingLayer, setEditingLayer] = useState<MapLayer | null>(null);
  const [layerName, setLayerName] = useState('');
  const [layerColor, setLayerColor] = useState('');

  const toggleLayer = (id: string) => {
    onLayersChange(
      layers.map(layer =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const deleteLayer = (id: string) => {
    onLayersChange(layers.filter(layer => layer.id !== id));
  };

  const startEditLayer = (layer: MapLayer) => {
    setEditingLayer(layer);
    setLayerName(layer.name);
    setLayerColor(layer.color);
  };

  const saveLayerEdit = () => {
    if (editingLayer) {
      onLayersChange(
        layers.map(layer =>
          layer.id === editingLayer.id
            ? { ...layer, name: layerName, color: layerColor }
            : layer
        )
      );
      setEditingLayer(null);
    }
  };

  // Group layers by type
  const baseDataLayers = layers.filter(l => ['buildings', 'landuse', 'transit', 'green', 'population'].includes(l.type));
  const aiGeneratedLayers = layers.filter(l => l.type === 'ai-generated');

  const LayerGroup = ({ title, groupLayers }: { title: string; groupLayers: MapLayer[] }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1">
        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      </div>
      {groupLayers.map(layer => (
        <div
          key={layer.id}
          className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <button className="cursor-grab hover:bg-muted rounded p-0.5">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0 border border-border"
            style={{ backgroundColor: layer.color }}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{layer.name}</p>
              {layer.objectCount !== undefined && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {layer.objectCount}
                </Badge>
              )}
            </div>
            {layer.dataSource && (
              <p className="text-xs text-muted-foreground">{layer.dataSource}</p>
            )}
          </div>
          
          <Switch
            checked={layer.visible}
            onCheckedChange={() => toggleLayer(layer.id)}
            className="scale-75"
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => {
                    e.preventDefault();
                    startEditLayer(layer);
                  }}>
                    <Palette className="w-4 h-4 mr-2" />
                    Edit Style
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Layer Style</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="layer-name">Layer Name</Label>
                      <Input
                        id="layer-name"
                        value={layerName}
                        onChange={(e) => setLayerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="layer-color">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="layer-color"
                          type="color"
                          value={layerColor}
                          onChange={(e) => setLayerColor(e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={layerColor}
                          onChange={(e) => setLayerColor(e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <Button onClick={saveLayerEdit} className="w-full">
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {onExportLayer && (
                <DropdownMenuItem onClick={() => onExportLayer(layer.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Layer
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={() => deleteLayer(layer.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Layer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Map Layers</span>
          <Badge variant="outline" className="text-xs">
            {layers.filter(l => l.visible).length}/{layers.length} visible
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiGeneratedLayers.length > 0 && (
          <LayerGroup title="AI Generated" groupLayers={aiGeneratedLayers} />
        )}
        
        {baseDataLayers.length > 0 && (
          <LayerGroup title="Base Data" groupLayers={baseDataLayers} />
        )}
        
        {layers.length === 0 && (
          <div className="text-center py-8">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No layers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Layers will appear here as you analyze the site
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
