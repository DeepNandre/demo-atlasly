import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

interface WindRoseData {
  direction: string;
  frequency: number;
  avgSpeed: number;
}

interface WindRoseChartProps {
  data: WindRoseData[];
  title?: string;
}

export const WindRoseChart = ({ data, title = "Wind Rose" }: WindRoseChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No wind data available</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for radar chart
  const chartData = data.map(d => ({
    direction: d.direction,
    frequency: d.frequency,
    speed: parseFloat(d.avgSpeed as any) || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="direction" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar
              name="Frequency"
              dataKey="frequency"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'Frequency') return [`${value} observations`, 'Frequency'];
                return [value, name];
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Wind direction frequency over 7 days
        </div>
      </CardContent>
    </Card>
  );
};
