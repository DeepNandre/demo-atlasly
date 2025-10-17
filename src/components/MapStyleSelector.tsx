import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Map, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MapStyleType = 'default' | 'satellite' | 'simple' | 'dark' | 'terrain' | 'streets';

interface MapStyleOption {
  id: MapStyleType;
  name: string;
  preview: string;
  description: string;
}

const mapStyles: MapStyleOption[] = [
  {
    id: 'default',
    name: 'Default',
    preview: 'linear-gradient(135deg, hsl(210 100% 90%), hsl(210 100% 96%))',
    description: 'Standard map with balanced details'
  },
  {
    id: 'satellite',
    name: 'Satellite',
    preview: 'linear-gradient(135deg, hsl(120 20% 35%), hsl(200 40% 45%))',
    description: 'High-resolution aerial imagery'
  },
  {
    id: 'simple',
    name: 'Simple',
    preview: 'linear-gradient(135deg, hsl(0 0% 95%), hsl(0 0% 98%))',
    description: 'Clean minimal style'
  },
  {
    id: 'dark',
    name: 'Dark',
    preview: 'linear-gradient(135deg, hsl(0 0% 15%), hsl(0 0% 10%))',
    description: 'Dark theme for focus'
  },
  {
    id: 'terrain',
    name: 'Terrain',
    preview: 'linear-gradient(135deg, hsl(40 45% 75%), hsl(120 30% 70%))',
    description: 'Topographic features highlighted'
  },
  {
    id: 'streets',
    name: 'Streets',
    preview: 'linear-gradient(135deg, hsl(45 100% 96%), hsl(0 0% 100%))',
    description: 'Detailed street-level view'
  }
];

interface MapStyleSelectorProps {
  currentStyle: MapStyleType;
  onStyleChange: (style: MapStyleType) => void;
}

export const MapStyleSelector = ({ currentStyle, onStyleChange }: MapStyleSelectorProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="shadow-lg gap-2">
          <Map className="w-4 h-4" />
          Map Style
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Style your basemap</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 py-4">
          {mapStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={cn(
                "relative group rounded-lg overflow-hidden border-2 transition-all",
                currentStyle === style.id 
                  ? "border-primary shadow-md" 
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Preview */}
              <div 
                className="aspect-[4/3] w-full"
                style={{ background: style.preview }}
              />
              
              {/* Selected indicator */}
              {currentStyle === style.id && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              {/* Label */}
              <div className="p-3 bg-card">
                <p className={cn(
                  "font-medium text-sm",
                  currentStyle === style.id ? "text-primary" : "text-foreground"
                )}>
                  {style.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {style.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
