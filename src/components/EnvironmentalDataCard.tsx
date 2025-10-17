import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WindRoseChart } from './charts/WindRoseChart';
import { SolarRadiationChart } from './charts/SolarRadiationChart';
import { Download, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EnvironmentalDataCardProps {
  environmentalData: {
    wind?: {
      current: number;
      direction: number;
      rose: Array<{ direction: string; frequency: number; avgSpeed: number }>;
      unit: string;
    };
    solar?: {
      daily: number[];
      dates: string[];
      unit: string;
    };
    temperature?: {
      max: number[];
      min: number[];
      dates: string[];
      unit: string;
    };
  };
  dataSource?: string;
  onCreateLayer?: () => void;
}

export const EnvironmentalDataCard = ({ 
  environmentalData, 
  dataSource = "Open-Meteo API",
  onCreateLayer 
}: EnvironmentalDataCardProps) => {
  const handleExportChart = () => {
    // TODO: Implement chart export as image
    console.log('Exporting chart...');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Environmental Analysis</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {dataSource}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleExportChart}
              title="Export as image"
            >
              <Download className="w-4 h-4" />
            </Button>
            {onCreateLayer && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onCreateLayer}
                title="View on map"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wind Data */}
        {environmentalData.wind && environmentalData.wind.rose && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Wind</span>
              <span className="font-medium">
                {environmentalData.wind.current.toFixed(1)} {environmentalData.wind.unit} 
                {' • '}
                {environmentalData.wind.direction}°
              </span>
            </div>
            <WindRoseChart data={environmentalData.wind.rose} />
          </div>
        )}

        {/* Solar Radiation */}
        {environmentalData.solar && environmentalData.solar.daily && (
          <SolarRadiationChart 
            data={environmentalData.solar.daily}
            dates={environmentalData.solar.dates}
            unit={environmentalData.solar.unit}
          />
        )}

        {/* Temperature Summary */}
        {environmentalData.temperature && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Temperature Range (7 days)
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">High: </span>
                <span className="font-medium">
                  {Math.max(...environmentalData.temperature.max).toFixed(1)}{environmentalData.temperature.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Low: </span>
                <span className="font-medium">
                  {Math.min(...environmentalData.temperature.min).toFixed(1)}{environmentalData.temperature.unit}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
