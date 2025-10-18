import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Layers, 
  GripVertical,
  MoreVertical,
  Palette,
  Download,
  Trash2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

interface MapLayerSelectorProps {
  layers: MapLayer[];
  onLayersChange: (layers: MapLayer[]) => void;
  onExportLayer?: (layerId: string) => void;
}

export const MapLayerSelector = ({ 
  layers, 
  onLayersChange,
  onExportLayer 
}: MapLayerSelectorProps) => {
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

  const visibleCount = layers.filter(l => l.visible).length;
  const baseDataLayers = layers.filter(l => ['buildings', 'landuse', 'transit', 'green', 'population'].includes(l.type));
  const aiGeneratedLayers = layers.filter(l => l.type === 'ai-generated');

  const LayerGroup = ({ title, groupLayers }: { title: string; groupLayers: MapLayer[] }) => {
    if (groupLayers.length === 0) return null;
    
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <Badge variant="outline" className="ml-auto text-xs h-5">
            {groupLayers.length}
          </Badge>
        </div>
        <div className="space-y-0.5">
          {groupLayers.map(layer => (
            <div
              key={layer.id}
              className="group flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent/50 transition-all"
            >
              <button className="cursor-grab hover:bg-muted rounded p-0.5 transition-colors">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              
              <div
                className="w-3.5 h-3.5 rounded flex-shrink-0 border border-background shadow-sm"
                style={{ backgroundColor: layer.color }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{layer.name}</p>
                  {layer.objectCount !== undefined && layer.objectCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                      {layer.objectCount}
                    </Badge>
                  )}
                </div>
                {layer.dataSource && (
                  <p className="text-xs text-muted-foreground">
                    • {layer.dataSource}
                  </p>
                )}
              </div>
              
              <Switch
                checked={layer.visible}
                onCheckedChange={() => toggleLayer(layer.id)}
                className="scale-90"
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
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
                    <DialogContent className="bg-background z-50">
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
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="shadow-lg gap-2">
          <Layers className="w-4 h-4" />
          Map Layers
          <Badge variant="outline" className="ml-1 h-5 px-1.5">
            {visibleCount}/{layers.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[380px] p-4 bg-card border-border shadow-xl z-50" 
        align="start"
        side="bottom"
        sideOffset={8}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-base">Map Layers</h3>
            </div>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-1">
              {visibleCount}/{layers.length}
            </Badge>
          </div>

          {/* Layer Groups */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {baseDataLayers.length > 0 && (
              <LayerGroup title="Base Data" groupLayers={baseDataLayers} />
            )}
            
            {aiGeneratedLayers.length > 0 && (
              <LayerGroup title="AI Generated" groupLayers={aiGeneratedLayers} />
            )}
            
            {layers.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Layers className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No layers yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Layers will appear as you analyze the site
                </p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
