import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw, Plus, ArrowLeft, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { getClientId } from '@/lib/clientId';
import { toast } from 'sonner';

interface SiteRequest {
  id: string;
  created_at: string;
  location_name: string;
  radius_meters: number;
  status: string;
  progress: number;
  file_url: string | null;
  error_message: string | null;
  area_sqm: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SiteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchRequests = async () => {
    try {
      const clientId = getClientId();
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('site_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by user_id if authenticated, otherwise by client_id
      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load site requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Poll for updates every 5 seconds if there are processing requests
    const interval = setInterval(() => {
      if (requests.some(r => r.status === 'processing' || r.status === 'pending')) {
        fetchRequests();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [requests.length]);

  const handleRetry = async (requestId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(requestId));

      const { error } = await supabase.functions.invoke('process-site-request', {
        body: { requestId },
      });

      if (error) throw error;

      toast.success('Processing restarted');
      fetchRequests();
    } catch (error) {
      console.error('Error retrying:', error);
      toast.error('Failed to restart processing');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Button onClick={() => navigate('/generate')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Site Pack
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-serif font-bold">Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Track and download your site pack requests
            </p>
          </div>

          {loading ? (
            <Card className="p-12 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              </div>
            </Card>
          ) : requests.length === 0 ? (
            <Card className="p-12 text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-semibold">No Site Packs Yet</h2>
                <p className="text-muted-foreground">
                  Create your first site pack to get started
                </p>
              </div>
              <Button onClick={() => navigate('/generate')} size="lg" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Site Pack
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.location_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(request.created_at)}
                      </TableCell>
                      <TableCell>
                        {(request.area_sqm / 10000).toFixed(2)} ha
                      </TableCell>
                      <TableCell>{request.radius_meters}m</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={request.progress || 0} className="h-2 w-20" />
                          <span className="text-sm text-muted-foreground">
                            {request.progress || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {request.status === 'completed' && (
                            <>
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                              >
                                <a href={`/preview/${request.id}`}>
                                  <Box className="w-4 h-4 mr-1" />
                                  View 3D
                                </a>
                              </Button>
                              {request.file_url && (
                                <Button asChild size="sm" variant="default">
                                  <a href={request.file_url} download>
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </a>
                                </Button>
                              )}
                            </>
                          )}
                          {request.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetry(request.id)}
                              disabled={processingIds.has(request.id)}
                            >
                              <RefreshCw
                                className={`w-4 h-4 mr-1 ${
                                  processingIds.has(request.id) ? 'animate-spin' : ''
                                }`}
                              />
                              Retry
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {requests.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {requests.length} site pack{requests.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
