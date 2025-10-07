import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface LayerTogglesProps {
  layers: {
    buildings: boolean;
    roads: boolean;
    terrain: boolean;
  };
  onToggle: (layer: keyof LayerTogglesProps['layers']) => void;
}

export function LayerToggles({ layers, onToggle }: LayerTogglesProps) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">Layers</h3>
      
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
