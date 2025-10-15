import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Calendar,
  Zap,
  Target
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface MetricsData {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalSiteRequests: number;
  completedRequests: number;
  failedRequests: number;
  avgCompletionTime: number;
  totalApiCalls: number;
  mrr: number;
  arr: number;
  paidUsers: number;
  freeTierUsers: number;
  proTierUsers: number;
  teamsTierUsers: number;
  enterpriseTierUsers: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function AdminMetrics() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);

        // Fetch total users count
        const { count: totalUsers } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true });

        // Fetch site requests metrics
        const { data: siteRequests } = await supabase
          .from('site_requests')
          .select('status, completed_at, created_at');

        const completed = siteRequests?.filter(r => r.status === 'completed').length || 0;
        const failed = siteRequests?.filter(r => r.status === 'failed').length || 0;

        // Calculate average completion time for completed requests
        const completedWithTime = siteRequests?.filter(
          r => r.status === 'completed' && r.completed_at && r.created_at
        ) || [];
        
        const avgTime = completedWithTime.length > 0
          ? completedWithTime.reduce((sum, r) => {
              const start = new Date(r.created_at).getTime();
              const end = new Date(r.completed_at).getTime();
              return sum + (end - start);
            }, 0) / completedWithTime.length / 1000 / 60 // Convert to minutes
          : 0;

        // Fetch API usage
        const { count: apiCalls } = await supabase
          .from('api_requests')
          .select('*', { count: 'exact', head: true });

        // Fetch subscription tiers
        const { data: subscriptions } = await supabase
          .from('user_subscriptions')
          .select('tier');

        const tierCounts = {
          free: subscriptions?.filter(s => s.tier === 'free').length || 0,
          pro: subscriptions?.filter(s => s.tier === 'pro').length || 0,
          teams: subscriptions?.filter(s => s.tier === 'teams').length || 0,
          enterprise: subscriptions?.filter(s => s.tier === 'enterprise').length || 0,
        };

        // Calculate MRR (Monthly Recurring Revenue)
        const proMRR = tierCounts.pro * 49;
        const teamsMRR = tierCounts.teams * 299;
        const totalMRR = proMRR + teamsMRR; // Enterprise is custom
        const totalARR = totalMRR * 12;

        // Calculate new users by time period
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data: allSubs } = await supabase
          .from('user_subscriptions')
          .select('created_at');

        const newToday = allSubs?.filter(s => new Date(s.created_at) >= todayStart).length || 0;
        const newThisWeek = allSubs?.filter(s => new Date(s.created_at) >= weekStart).length || 0;
        const newThisMonth = allSubs?.filter(s => new Date(s.created_at) >= monthStart).length || 0;

        setMetrics({
          totalUsers: totalUsers || 0,
          newUsersToday: newToday,
          newUsersThisWeek: newThisWeek,
          newUsersThisMonth: newThisMonth,
          totalSiteRequests: siteRequests?.length || 0,
          completedRequests: completed,
          failedRequests: failed,
          avgCompletionTime: Math.round(avgTime),
          totalApiCalls: apiCalls || 0,
          mrr: totalMRR,
          arr: totalARR,
          paidUsers: tierCounts.pro + tierCounts.teams + tierCounts.enterprise,
          freeTierUsers: tierCounts.free,
          proTierUsers: tierCounts.pro,
          teamsTierUsers: tierCounts.teams,
          enterpriseTierUsers: tierCounts.enterprise,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchMetrics();
    }
  }, [isAdmin]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto p-8 space-y-8 mt-16">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const tierDistributionData = [
    { name: 'Free', value: metrics.freeTierUsers },
    { name: 'Pro', value: metrics.proTierUsers },
    { name: 'Teams', value: metrics.teamsTierUsers },
    { name: 'Enterprise', value: metrics.enterpriseTierUsers },
  ];

  const requestStatusData = [
    { name: 'Completed', value: metrics.completedRequests },
    { name: 'Failed', value: metrics.failedRequests },
    { name: 'Processing', value: metrics.totalSiteRequests - metrics.completedRequests - metrics.failedRequests },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="border-b bg-card mt-16">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">Admin Metrics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time analytics and business intelligence
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    +{metrics.newUsersToday} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MRR</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.mrr.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    ${metrics.arr.toLocaleString()} ARR
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Site Packs</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalSiteRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.completedRequests} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalApiCalls}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tier Distribution</CardTitle>
                  <CardDescription>Current subscription breakdown</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {tierDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Request Status</CardTitle>
                  <CardDescription>Site pack generation status</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={requestStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{metrics.newUsersToday}</div>
                  <p className="text-xs text-muted-foreground">New signups</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{metrics.newUsersThisWeek}</div>
                  <p className="text-xs text-muted-foreground">New signups</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{metrics.newUsersThisMonth}</div>
                  <p className="text-xs text-muted-foreground">New signups</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Growth Metrics</CardTitle>
                <CardDescription>User acquisition over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Users</span>
                      <span className="text-sm text-muted-foreground">{metrics.totalUsers}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Paid Users</span>
                      <span className="text-sm text-muted-foreground">
                        {metrics.paidUsers} ({metrics.totalUsers > 0 ? ((metrics.paidUsers / metrics.totalUsers) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${metrics.totalUsers > 0 ? (metrics.paidUsers / metrics.totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgCompletionTime} min</div>
                  <p className="text-xs text-muted-foreground">Site pack generation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalSiteRequests > 0 
                      ? ((metrics.completedRequests / metrics.totalSiteRequests) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Completion rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg per User</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalUsers > 0 
                      ? (metrics.totalSiteRequests / metrics.totalUsers).toFixed(1)
                      : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Site packs per user</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MRR</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.mrr.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Monthly recurring</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ARR</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.arr.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Annual run rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${metrics.totalUsers > 0 ? (metrics.mrr / metrics.totalUsers).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg revenue per user</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Conversion</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalUsers > 0 
                      ? ((metrics.paidUsers / metrics.totalUsers) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Free to paid</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown by Tier</CardTitle>
                <CardDescription>Monthly recurring revenue distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Pro ($49/mo)</span>
                      <span className="text-sm text-muted-foreground">
                        ${(metrics.proTierUsers * 49).toLocaleString()} ({metrics.proTierUsers} users)
                      </span>
                    </div>
                     <div className="h-2 bg-muted rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-blue-500" 
                         style={{ 
                           width: metrics && metrics.mrr > 0 
                             ? `${(((metrics.proTierUsers || 0) * 49) / metrics.mrr) * 100}%` 
                             : '0%' 
                         }}
                       />
                     </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Teams ($299/mo)</span>
                      <span className="text-sm text-muted-foreground">
                        ${(metrics.teamsTierUsers * 299).toLocaleString()} ({metrics.teamsTierUsers} users)
                      </span>
                    </div>
                     <div className="h-2 bg-muted rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-green-500" 
                         style={{ 
                           width: metrics && metrics.mrr > 0 
                             ? `${(((metrics.teamsTierUsers || 0) * 299) / metrics.mrr) * 100}%` 
                             : '0%' 
                         }}
                       />
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
