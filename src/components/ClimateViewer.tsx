import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ClimateData {
  monthly?: {
    month: string;
    avgTemp: number;
    maxTemp: number;
    minTemp: number;
    rainfall: number;
    solarIrradiance: number;
  }[];
  windRose?: {
    direction: string;
    speed: number;
  }[];
  solarMap?: {
    hour: number;
    day: string;
    irradiance: number;
  }[];
}

interface ClimateViewerProps {
  climateData: ClimateData;
}

export const ClimateViewer = ({ climateData }: ClimateViewerProps) => {
  if (!climateData) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No climate data available</p>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="temperature" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="temperature">Temperature</TabsTrigger>
        <TabsTrigger value="solar">Solar</TabsTrigger>
        <TabsTrigger value="wind">Wind</TabsTrigger>
        <TabsTrigger value="rainfall">Rainfall</TabsTrigger>
      </TabsList>

      <TabsContent value="temperature" className="space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Temperature</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={climateData.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="maxTemp" stroke="#ef4444" name="Max Temp" />
              <Line type="monotone" dataKey="avgTemp" stroke="#3b82f6" name="Avg Temp" />
              <Line type="monotone" dataKey="minTemp" stroke="#06b6d4" name="Min Temp" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </TabsContent>

      <TabsContent value="solar" className="space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Solar Irradiance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={climateData.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Irradiance (W/m²)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="solarIrradiance" fill="#f59e0b" name="Solar Irradiance" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {climateData.solarMap && climateData.solarMap.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Solar Map (Equinox/Solstice)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={climateData.solarMap}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottom' }} />
                <YAxis label={{ value: 'Irradiance (W/m²)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="irradiance" stroke="#f59e0b" name="Irradiance" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="wind" className="space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Wind Rose</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={climateData.windRose || []}>
              <PolarGrid />
              <PolarAngleAxis dataKey="direction" />
              <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
              <Radar name="Wind Speed" dataKey="speed" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </TabsContent>

      <TabsContent value="rainfall" className="space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Rainfall</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={climateData.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="rainfall" fill="#3b82f6" name="Rainfall" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
