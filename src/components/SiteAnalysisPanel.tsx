import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, 
  Thermometer, 
  Wind, 
  Sun, 
  CloudRain,
  Mountain,
  Building2,
  Ruler,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SiteAnalysisPanelProps {
  siteRequestId: string;
}

interface SiteData {
  location_name: string;
  center_lat: number;
  center_lng: number;
  area_sqm: number;
  climate_summary: any;
  include_terrain: boolean;
  include_buildings: boolean;
  include_roads: boolean;
  status: string;
}

export const SiteAnalysisPanel = ({ siteRequestId }: SiteAnalysisPanelProps) => {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSiteData();
  }, [siteRequestId]);

  const loadSiteData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_requests')
        .select('*')
        .eq('id', siteRequestId)
        .single();

      if (error) throw error;
      setSiteData(data);
    } catch (error) {
      console.error('Error loading site data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!siteData) {
    return (
      <Card className="h-full">
        <CardContent className="py-12 text-center text-muted-foreground">
          No site data available
        </CardContent>
      </Card>
    );
  }

  const climate = siteData.climate_summary || {};
  const hasClimate = climate.monthly && Array.isArray(climate.monthly);

  // Calculate climate metrics
  let tempRange = { min: 0, max: 0 };
  let annualRainfall = 0;
  let avgSolar = 0;
  let prevailingWind = { direction: 'N/A', speed: 0 };

  if (hasClimate) {
    const temps = climate.monthly.map((m: any) => m.temp_avg);
    tempRange = {
      min: Math.min(...temps),
      max: Math.max(...temps)
    };

    annualRainfall = climate.monthly.reduce((sum: number, m: any) => 
      sum + (m.precipitation || 0), 0
    );

    const solarData = climate.monthly.map((m: any) => m.solar_kwh_m2 || 0);
    avgSolar = solarData.reduce((a: number, b: number) => a + b, 0) / 12;

    if (climate.wind_rose && Array.isArray(climate.wind_rose)) {
      const maxWind = climate.wind_rose.reduce((max: any, curr: any) => 
        curr.speed > max.speed ? curr : max
      , climate.wind_rose[0]);
      prevailingWind = maxWind;
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Site Analysis
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="p-6 space-y-6">
          {/* Location Overview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Coordinates</p>
                <p className="text-sm font-mono">
                  {siteData.center_lat.toFixed(4)}°N<br />
                  {siteData.center_lng.toFixed(4)}°E
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="text-sm font-medium">
                  {siteData.area_sqm ? `${siteData.area_sqm.toFixed(0)} m²` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Site Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Available Data
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={siteData.include_terrain ? "default" : "secondary"}>
                <Mountain className="w-3 h-3 mr-1" />
                Terrain
              </Badge>
              <Badge variant={siteData.include_buildings ? "default" : "secondary"}>
                <Building2 className="w-3 h-3 mr-1" />
                Buildings
              </Badge>
              <Badge variant={hasClimate ? "default" : "secondary"}>
                <Thermometer className="w-3 h-3 mr-1" />
                Climate
              </Badge>
            </div>
          </div>

          {/* Climate Analysis */}
          {hasClimate && (
            <Tabs defaultValue="temperature" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="temperature" className="text-xs">
                  <Thermometer className="w-3 h-3 mr-1" />
                  Temp
                </TabsTrigger>
                <TabsTrigger value="solar" className="text-xs">
                  <Sun className="w-3 h-3 mr-1" />
                  Solar
                </TabsTrigger>
                <TabsTrigger value="wind" className="text-xs">
                  <Wind className="w-3 h-3 mr-1" />
                  Wind
                </TabsTrigger>
              </TabsList>

              <TabsContent value="temperature" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-muted-foreground mb-1">Min Temp</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {tempRange.min.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-muted-foreground mb-1">Max Temp</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {tempRange.max.toFixed(1)}°C
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-muted-foreground mb-1">Annual Rainfall</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {annualRainfall.toFixed(0)} mm
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="solar" className="space-y-3 mt-4">
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Monthly Solar</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {avgSolar.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">kWh/m²</p>
                    </div>
                    <Sun className="w-8 h-8 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Solar Potential</span>
                      <span className="font-medium">
                        {avgSolar > 4 ? 'Excellent' : avgSolar > 3 ? 'Good' : 'Moderate'}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="wind" className="space-y-3 mt-4">
                <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Prevailing Direction</p>
                      <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                        {prevailingWind.direction}
                      </p>
                    </div>
                    <Wind className="w-8 h-8 text-cyan-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Avg Speed</span>
                      <span className="font-medium">{prevailingWind.speed.toFixed(1)} m/s</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Design Insights */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Quick Insights
            </h3>
            <div className="space-y-2 text-sm">
              {hasClimate && (
                <>
                  {tempRange.max > 25 && (
                    <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-orange-700 dark:text-orange-300">
                        <strong>Cooling Priority:</strong> High summer temps require shading and ventilation
                      </p>
                    </div>
                  )}
                  {avgSolar > 4 && (
                    <div className="p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300">
                        <strong>Solar Opportunity:</strong> Excellent conditions for PV panels
                      </p>
                    </div>
                  )}
                  {prevailingWind.speed > 3 && (
                    <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Natural Ventilation:</strong> Good wind speeds for passive cooling
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
