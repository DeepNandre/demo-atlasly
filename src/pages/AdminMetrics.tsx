import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MapPin, Clock, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

interface Metrics {
  totalSites: number;
  completedSites: number;
  avgProcessingTime: number;
  topCities: { city: string; count: number }[];
  dailyGeneration: { date: string; count: number }[];
}

const AdminMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Total sites
      const { count: totalCount } = await supabase
        .from('site_requests')
        .select('*', { count: 'exact', head: true });

      // Completed sites
      const { count: completedCount } = await supabase
        .from('site_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Average processing time
      const { data: jobData } = await supabase
        .from('job_logs')
        .select('duration_ms')
        .eq('stage', 'complete')
        .not('duration_ms', 'is', null);

      const avgTime = jobData && jobData.length > 0
        ? jobData.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / jobData.length / 1000
        : 0;

      // Top cities
      const { data: sitesData } = await supabase
        .from('site_requests')
        .select('location_name')
        .limit(1000);

      const cityCount: Record<string, number> = {};
      sitesData?.forEach(site => {
        const city = site.location_name.split(',')[0];
        cityCount[city] = (cityCount[city] || 0) + 1;
      });

      const topCities = Object.entries(cityCount)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Daily generation (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dailyData } = await supabase
        .from('site_requests')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const dailyCount: Record<string, number> = {};
      dailyData?.forEach(site => {
        const date = new Date(site.created_at).toLocaleDateString();
        dailyCount[date] = (dailyCount[date] || 0) + 1;
      });

      const dailyGeneration = Object.entries(dailyCount)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setMetrics({
        totalSites: totalCount || 0,
        completedSites: completedCount || 0,
        avgProcessingTime: avgTime,
        topCities,
        dailyGeneration
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-12">
          <p className="text-center text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Metrics</h1>
          <p className="text-muted-foreground mt-2">System performance and usage statistics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSites}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completedSites}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((metrics.completedSites / metrics.totalSites) * 100).toFixed(1)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Process Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgProcessingTime.toFixed(1)}s</div>
              <p className="text-xs text-muted-foreground mt-1">Per site pack</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top City</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.topCities[0]?.city || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.topCities[0]?.count || 0} sites
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Generation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Site Generation (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.dailyGeneration}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Cities Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={metrics.topCities} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="city" type="category" width={150} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminMetrics;
