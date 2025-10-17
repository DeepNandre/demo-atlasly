import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Building2, TreePine, Bus, MapPin, Layers } from 'lucide-react';

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
    <div className="w-full">
      <div className="p-3 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Map Layers</h3>
      </div>

      <div className="p-3 space-y-2">
        {layers.map((layer) => {
          const Icon = layerIcons[layer.type];
          return (
            <div
              key={layer.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-smooth"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${layer.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: layer.color }} />
                </div>
                <Label
                  htmlFor={`layer-${layer.id}`}
                  className="text-sm font-medium cursor-pointer text-foreground"
                >
                  {layer.name}
                </Label>
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

      <div className="p-3 border-t border-border/50">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Legend</h4>
        <div className="space-y-1.5">
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
    </div>
  );
};
