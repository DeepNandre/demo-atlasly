import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface SimpleLayerTogglesProps {
  layers: {
    buildings: boolean;
    roads: boolean;
    terrain: boolean;
  };
  onToggle: (layer: keyof SimpleLayerTogglesProps['layers']) => void;
}

export function SimpleLayerToggles({ layers, onToggle }: SimpleLayerTogglesProps) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">Map Layers</h3>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="buildings-toggle" className="text-sm cursor-pointer">
          Buildings
        </Label>
        <Switch
          id="buildings-toggle"
          checked={layers.buildings}
          onCheckedChange={() => onToggle('buildings')}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="roads-toggle" className="text-sm cursor-pointer">
          Roads
        </Label>
        <Switch
          id="roads-toggle"
          checked={layers.roads}
          onCheckedChange={() => onToggle('roads')}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="terrain-toggle" className="text-sm cursor-pointer">
          Terrain
        </Label>
        <Switch
          id="terrain-toggle"
          checked={layers.terrain}
          onCheckedChange={() => onToggle('terrain')}
        />
      </div>
    </Card>
  );
}

interface SimpleContextLayerTogglesProps {
  layers: {
    aerial: boolean;
    parcels: boolean;
    historical: boolean;
  };
  onToggle: (layer: keyof SimpleContextLayerTogglesProps['layers']) => void;
}

export function SimpleContextLayerToggles({ layers, onToggle }: SimpleContextLayerTogglesProps) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">Context Layers</h3>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="aerial-toggle" className="text-sm cursor-pointer">
          Aerial
        </Label>
        <Switch
          id="aerial-toggle"
          checked={layers.aerial}
          onCheckedChange={() => onToggle('aerial')}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="parcels-toggle" className="text-sm cursor-pointer">
          Parcels
        </Label>
        <Switch
          id="parcels-toggle"
          checked={layers.parcels}
          onCheckedChange={() => onToggle('parcels')}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="historical-toggle" className="text-sm cursor-pointer">
          Historical
        </Label>
        <Switch
          id="historical-toggle"
          checked={layers.historical}
          onCheckedChange={() => onToggle('historical')}
        />
      </div>
    </Card>
  );
}
