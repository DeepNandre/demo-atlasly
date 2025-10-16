import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layers, Building2, TreePine, Bus, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'buildings' | 'landuse' | 'transit' | 'green' | 'population';
}

interface MapLayerControlsProps {
  layers: MapLayer[];
  onLayerToggle: (layerId: string) => void;
}

const layerIcons = {
  buildings: Building2,
  landuse: MapPin,
  transit: Bus,
  green: TreePine,
  population: Layers
};

export const MapLayerControls = ({ layers, onLayerToggle }: MapLayerControlsProps) => {
  return (
    <Card className="h-full flex flex-col bg-card border-border">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Map Layers</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Toggle data visualization
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {layers.map((layer) => {
            const Icon = layerIcons[layer.type];
            return (
              <div
                key={layer.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${layer.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: layer.color }} />
                  </div>
                  <div>
                    <Label
                      htmlFor={`layer-${layer.id}`}
                      className="text-sm font-medium cursor-pointer text-foreground"
                    >
                      {layer.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {layer.type === 'buildings' && 'Building footprints'}
                      {layer.type === 'landuse' && 'Zoning & land use'}
                      {layer.type === 'transit' && 'Public transit stops'}
                      {layer.type === 'green' && 'Parks & green spaces'}
                      {layer.type === 'population' && 'Density heat map'}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`layer-${layer.id}`}
                  checked={layer.visible}
                  onCheckedChange={() => onLayerToggle(layer.id)}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg border border-border bg-muted/20">
          <h4 className="text-sm font-semibold mb-2 text-foreground">Legend</h4>
          <div className="space-y-2">
            {layers.map((layer) => (
              <div key={layer.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-xs text-muted-foreground">{layer.name}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};
