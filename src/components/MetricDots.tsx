interface MetricDotsProps {
  metrics: string;
  className?: string;
}

const MetricDots = ({ metrics, className = "" }: MetricDotsProps) => {
  const parts = metrics.split(' • ');
  
  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm text-muted-foreground ${className}`}>
      {parts.map((part, index) => (
        <div key={index} className="flex items-center gap-2">
          <span>{part}</span>
          {index < parts.length - 1 && (
            <span className="w-1 h-1 bg-mint rounded-full" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
};

export default MetricDots;