import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SolarRadiationChartProps {
  data: number[];
  dates: string[];
  title?: string;
  unit?: string;
}

export const SolarRadiationChart = ({ 
  data, 
  dates, 
  title = "Solar Radiation", 
  unit = "MJ/m²" 
}: SolarRadiationChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No solar data available</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for bar chart
  const chartData = data.map((value, idx) => {
    const date = dates[idx] ? new Date(dates[idx]) : new Date();
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      radiation: parseFloat(value?.toFixed(1) || '0')
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              stroke="hsl(var(--border))"
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              stroke="hsl(var(--border))"
              label={{ 
                value: unit, 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))'
              }}
              formatter={(value: any) => [`${value} ${unit}`, 'Radiation']}
            />
            <Bar 
              dataKey="radiation" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Daily solar radiation forecast
        </div>
      </CardContent>
    </Card>
  );
};
