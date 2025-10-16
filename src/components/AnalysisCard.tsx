import { Card } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface AnalysisCardProps {
  title: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  results?: {
    metric: string;
    value: string | number;
  }[];
  insights?: string[];
  error?: string;
}

export const AnalysisCard = ({ title, status, results, insights, error }: AnalysisCardProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'analyzing':
        return 'border-primary/20 bg-primary/5';
      case 'complete':
        return 'border-green-500/20 bg-green-500/5';
      case 'error':
        return 'border-destructive/20 bg-destructive/5';
      default:
        return 'border-border bg-muted/10';
    }
  };

  return (
    <Card className={`p-4 ${getStatusColor()} transition-smooth`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground mb-2">{title}</h4>
          
          {status === 'analyzing' && (
            <p className="text-xs text-muted-foreground">Analyzing data...</p>
          )}
          
          {status === 'error' && error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          
          {status === 'complete' && results && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{result.metric}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {result.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {status === 'complete' && insights && insights.length > 0 && (
            <div className="mt-3 space-y-1">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-primary text-xs mt-0.5">•</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
