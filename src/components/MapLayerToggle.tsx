import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population' | 'ai-generated';
  objectCount?: number;
  dataSource?: string;
}

interface MapLayerToggleProps {
  layers: MapLayer[];
  onToggleLayer: (layerId: string) => void;
}

export const MapLayerToggle = ({ layers, onToggleLayer }: MapLayerToggleProps) => {
  const visibleCount = layers.filter(l => l.visible).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="shadow-lg gap-2">
          <Layers className="w-4 h-4" />
          Layers ({visibleCount}/{layers.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Map Layers</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle visibility of different map layers
          </p>
        </DialogHeader>
        
        <div className="space-y-2 py-4 max-h-[60vh] overflow-y-auto">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Color indicator */}
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                
                {/* Layer info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{layer.name}</p>
                  {layer.objectCount !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {layer.objectCount} {layer.objectCount === 1 ? 'object' : 'objects'}
                      {layer.dataSource && ` • ${layer.dataSource}`}
                    </p>
                  )}
                </div>

                {/* Toggle switch */}
                <Switch
                  checked={layer.visible}
                  onCheckedChange={() => onToggleLayer(layer.id)}
                />
              </div>
            </div>
          ))}
        </div>

        {layers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No layers available yet</p>
            <p className="text-xs mt-1">Layers will appear as you analyze the site</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
