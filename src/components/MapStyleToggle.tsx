import { Button } from '@/components/ui/button';
import { Map, Satellite } from 'lucide-react';

interface MapStyleToggleProps {
  style: 'standard' | 'satellite';
  onStyleChange: (style: 'standard' | 'satellite') => void;
}

export const MapStyleToggle = ({ style, onStyleChange }: MapStyleToggleProps) => {
  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2 bg-card/90 backdrop-blur-sm rounded-lg border border-border p-1 shadow-medium">
      <Button
        variant={style === 'standard' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onStyleChange('standard')}
        className="gap-2"
      >
        <Map className="w-4 h-4" />
        <span className="text-xs">Map</span>
      </Button>
      <Button
        variant={style === 'satellite' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onStyleChange('satellite')}
        className="gap-2"
      >
        <Satellite className="w-4 h-4" />
        <span className="text-xs">Satellite</span>
      </Button>
    </div>
  );
};
