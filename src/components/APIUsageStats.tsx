import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Clock, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UsageStats {
  total_requests: number;
  requests_today: number;
  avg_response_time: number;
  success_rate: number;
}

export function APIUsageStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['api-usage-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's API keys
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id);

      if (!apiKeys || apiKeys.length === 0) {
        return {
          total_requests: 0,
          requests_today: 0,
          avg_response_time: 0,
          success_rate: 0,
        };
      }

      const keyIds = apiKeys.map(k => k.id);

      // Total requests
      const { count: totalCount } = await supabase
        .from('api_requests')
        .select('*', { count: 'exact', head: true })
        .in('api_key_id', keyIds);

      // Requests today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('api_requests')
        .select('*', { count: 'exact', head: true })
        .in('api_key_id', keyIds)
        .gte('created_at', today.toISOString());

      // Average response time and success rate (last 100 requests)
      const { data: recentRequests } = await supabase
        .from('api_requests')
        .select('response_time_ms, status_code')
        .in('api_key_id', keyIds)
        .order('created_at', { ascending: false })
        .limit(100);

      let avgResponseTime = 0;
      let successRate = 0;

      if (recentRequests && recentRequests.length > 0) {
        const totalTime = recentRequests.reduce((sum, r) => sum + (r.response_time_ms || 0), 0);
        avgResponseTime = totalTime / recentRequests.length;

        const successCount = recentRequests.filter(r => r.status_code >= 200 && r.status_code < 300).length;
        successRate = (successCount / recentRequests.length) * 100;
      }

      return {
        total_requests: totalCount || 0,
        requests_today: todayCount || 0,
        avg_response_time: Math.round(avgResponseTime),
        success_rate: Math.round(successRate),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading usage statistics...</p>
        </CardContent>
      </Card>
    );
  }

  const displayStats = stats || {
    total_requests: 0,
    requests_today: 0,
    avg_response_time: 0,
    success_rate: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayStats.total_requests.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">All-time API calls</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayStats.requests_today.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Requests in last 24h</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayStats.avg_response_time}ms</div>
          <p className="text-xs text-muted-foreground">Last 100 requests</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayStats.success_rate}%</div>
          <Badge variant={displayStats.success_rate >= 95 ? "default" : "secondary"} className="mt-1">
            {displayStats.success_rate >= 95 ? "Excellent" : "Good"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
