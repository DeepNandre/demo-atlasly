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
  const [isOpen, setIsOpen] = useState(false);

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

  const LayerGroup = ({ title, groupLayers }: { title: string; groupLayers: MapLayer[] }) => {
    if (groupLayers.length === 0) return null;
    
    return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
        <Badge variant="outline" className="ml-auto text-xs">
          {groupLayers.length}
        </Badge>
      </div>
      {groupLayers.map(layer => (
        <div
          key={layer.id}
          className="group flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all border border-transparent hover:border-border"
        >
          <button className="cursor-grab hover:bg-muted rounded p-1 transition-colors">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          
          <div
            className="w-4 h-4 rounded flex-shrink-0 border-2 border-background shadow-sm"
            style={{ backgroundColor: layer.color }}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold truncate">{layer.name}</p>
              {layer.objectCount !== undefined && layer.objectCount > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {layer.objectCount}
                </Badge>
              )}
            </div>
            {layer.dataSource && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-primary/60" />
                {layer.dataSource}
              </p>
            )}
          </div>
          
          <Switch
            checked={layer.visible}
            onCheckedChange={() => toggleLayer(layer.id)}
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
  };

  return (
    <Card className="w-full shadow-lg border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            Map Layers
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
            {layers.filter(l => l.visible).length}/{layers.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiGeneratedLayers.length > 0 && (
          <LayerGroup title="AI Generated" groupLayers={aiGeneratedLayers} />
        )}
        
        {baseDataLayers.length > 0 && (
          <LayerGroup title="Base Data" groupLayers={baseDataLayers} />
        )}
        
        {layers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No layers yet</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
              Start analyzing the site to generate data layers automatically
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
