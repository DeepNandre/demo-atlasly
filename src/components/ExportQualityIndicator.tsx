import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  details?: any;
}

interface ExportQualityIndicatorProps {
  status: 'pass' | 'warning' | 'fail' | 'pending';
  qualityScore?: number;
  issues?: ValidationIssue[];
  fileType?: string;
}

export function ExportQualityIndicator({
  status,
  qualityScore,
  issues = [],
  fileType,
}: ExportQualityIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pass':
        return {
          icon: CheckCircle2,
          label: 'Valid',
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-700 border-green-500/20',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          label: 'Minor Issues',
          variant: 'secondary' as const,
          className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
        };
      case 'fail':
        return {
          icon: XCircle,
          label: 'Invalid',
          variant: 'destructive' as const,
          className: 'bg-red-500/10 text-red-700 border-red-500/20',
        };
      default:
        return {
          icon: Info,
          label: 'Pending',
          variant: 'outline' as const,
          className: 'bg-muted',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={config.className}>
            <Icon className="w-3 h-3 mr-1" />
            {fileType && <span className="uppercase mr-1">{fileType}</span>}
            {config.label}
            {qualityScore !== undefined && (
              <span className="ml-1 font-mono">({qualityScore})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">
              Export Quality Report
              {qualityScore !== undefined && ` - Score: ${qualityScore}/100`}
            </div>
            
            {issues.length > 0 ? (
              <>
                {errorCount > 0 && (
                  <div className="text-red-600 text-xs">
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="text-yellow-600 text-xs">
                    {warningCount} warning{warningCount !== 1 ? 's' : ''}
                  </div>
                )}
                {infoCount > 0 && (
                  <div className="text-blue-600 text-xs">
                    {infoCount} info message{infoCount !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="border-t pt-2 space-y-1 max-h-48 overflow-y-auto">
                  {issues.slice(0, 5).map((issue, idx) => (
                    <div key={idx} className="text-xs">
                      <span className="font-medium">{issue.code}:</span>{' '}
                      {issue.message}
                    </div>
                  ))}
                  {issues.length > 5 && (
                    <div className="text-xs text-muted-foreground italic">
                      +{issues.length - 5} more issue{issues.length - 5 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">
                {status === 'pending'
                  ? 'Validation pending...'
                  : 'No issues detected'}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
