import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContextLayerTogglesProps {
  layers: {
    aerial: boolean;
    parcels: boolean;
    historical: boolean;
  };
  onToggle: (layer: keyof ContextLayerTogglesProps['layers']) => void;
}

export function ContextLayerToggles({ layers, onToggle }: ContextLayerTogglesProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Context Layers</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Additional map overlays to provide context. Data sources include OpenStreetMap and public tile servers. 
                Coverage may vary by location.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="aerial-toggle" className="text-sm cursor-pointer">
          Aerial Imagery
        </Label>
        <Switch
          id="aerial-toggle"
          checked={layers.aerial}
          onCheckedChange={() => onToggle('aerial')}
        />
      </div>

      <div className="flex items-center justify-between opacity-50">
        <Label htmlFor="parcels-toggle" className="text-sm cursor-pointer">
          Parcels
        </Label>
        <Switch
          id="parcels-toggle"
          checked={layers.parcels}
          onCheckedChange={() => onToggle('parcels')}
          disabled
        />
      </div>

      <div className="flex items-center justify-between opacity-50">
        <Label htmlFor="historical-toggle" className="text-sm cursor-pointer">
          Historical
        </Label>
        <Switch
          id="historical-toggle"
          checked={layers.historical}
          onCheckedChange={() => onToggle('historical')}
          disabled
        />
      </div>

      <p className="text-xs text-muted-foreground pt-2 border-t border-border">
        © OpenStreetMap contributors
      </p>
    </Card>
  );
}
