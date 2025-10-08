import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Admin() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch site requests (jobs)
      const { data: jobsData, error: jobsError } = await supabase
        .from('site_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (feedbackError) throw feedbackError;
      setFeedback(feedbackData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (requestId: string) => {
    try {
      const { error } = await supabase.functions.invoke('process-site-request', {
        body: { requestId },
      });

      if (error) throw error;
      toast.success('Job restarted');
      fetchData();
    } catch (error) {
      console.error('Error retrying job:', error);
      toast.error('Failed to restart job');
    }
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success('Feedback status updated');
      fetchData();
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to update feedback');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-serif font-bold">Admin Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Monitor jobs, view feedback, and manage system health
            </p>
          </div>

          <Tabs defaultValue="jobs" className="w-full">
            <TabsList>
              <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
              <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4">
              <Card className="overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(job.status)}
                              <Badge variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'failed' ? 'destructive' :
                                'secondary'
                              }>
                                {job.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {job.location_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(job.created_at)}
                          </TableCell>
                          <TableCell>{job.progress}%</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {job.status === 'failed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetry(job.id)}
                                >
                                  Retry
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/preview/${job.id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="space-y-4">
              <Card className="overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedback.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant={
                              item.status === 'resolved' ? 'default' :
                              item.status === 'in_progress' ? 'secondary' :
                              'outline'
                            }>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="truncate" title={item.message}>
                              {item.message}
                            </p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.email || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.page || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(item.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {item.status !== 'resolved' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateFeedbackStatus(item.id, 'resolved')}
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
