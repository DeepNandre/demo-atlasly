import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AnalysisTask {
  id: string;
  site_request_id: string;
  parent_task_id?: string;
  query: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  progress: number;
  result?: any;
  created_at: string;
  error_message?: string;
}

interface AnalysisProgressPanelProps {
  siteRequestId: string;
}

export const AnalysisProgressPanel = ({ siteRequestId }: AnalysisProgressPanelProps) => {
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTasks();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('analysis-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_tasks',
          filter: `site_request_id=eq.${siteRequestId}`
        },
        (payload) => {
          console.log('Task updated:', payload);
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteRequestId]);

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('analysis_tasks')
      .select('*')
      .eq('site_request_id', siteRequestId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setTasks(data as AnalysisTask[]);
    }
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="default" className="bg-green-600">Complete</Badge>;
      case 'analyzing':
        return <Badge variant="default">Analyzing...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Group tasks by parent
  const parentTasks = tasks.filter(t => !t.parent_task_id);
  const getSubTasks = (parentId: string) => tasks.filter(t => t.parent_task_id === parentId);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">Analysis Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {parentTasks.map(task => {
          const subTasks = getSubTasks(task.id);
          const isExpanded = expandedTasks.has(task.id);
          
          return (
            <Collapsible key={task.id} open={isExpanded} onOpenChange={() => toggleTask(task.id)}>
              <div className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {subTasks.length > 0 && (
                    <CollapsibleTrigger asChild>
                      <button className="flex-shrink-0 hover:bg-muted rounded p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  )}
                  {getStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{task.query}</p>
                      {getStatusLabel(task.status)}
                    </div>
                    {task.status === 'analyzing' && (
                      <div className="mt-2">
                        <Progress value={task.progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">{task.progress}%</p>
                      </div>
                    )}
                    {task.error_message && (
                      <p className="text-xs text-destructive mt-1">{task.error_message}</p>
                    )}
                  </div>
                </div>
                
                {subTasks.length > 0 && (
                  <CollapsibleContent>
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-3">
                      {subTasks.map(subTask => (
                        <div key={subTask.id} className="flex items-start gap-2">
                          {getStatusIcon(subTask.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground truncate">{subTask.query}</p>
                              <Badge variant="outline" className="text-xs">{subTask.status}</Badge>
                            </div>
                            {subTask.status === 'analyzing' && subTask.progress > 0 && (
                              <Progress value={subTask.progress} className="h-1 mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
