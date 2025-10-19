import { Button } from '@/components/ui/button';
import { 
  Bus, 
  TreePine, 
  Building2, 
  School, 
  TrendingUp,
  Zap,
  MapPin
} from 'lucide-react';

interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  query: string;
  color: string;
}

const templates: AnalysisTemplate[] = [
  {
    id: 'complete-assessment',
    name: 'Complete Assessment',
    description: 'Holistic site analysis with recommendations',
    icon: TrendingUp,
    query: 'Provide a complete site assessment covering OSM data, solar potential, climate factors, and development recommendations',
    color: '#6366F1'
  },
  {
    id: 'transport',
    name: 'Transport & Access',
    description: 'Transit, walkability, connectivity',
    icon: Bus,
    query: 'Analyze transport accessibility, transit stops, walkability score, and road connectivity',
    color: '#3B82F6'
  },
  {
    id: 'green-space',
    name: 'Green Space',
    description: 'Parks, gardens, open areas',
    icon: TreePine,
    query: 'Calculate green space percentage, identify parks and gardens, analyze accessibility to nature',
    color: '#10B981'
  },
  {
    id: 'solar-climate',
    name: 'Solar & Climate',
    description: 'Sun exposure, orientation, passive design',
    icon: Zap,
    query: "Analyze solar potential, optimal building orientation, wind patterns, and passive design strategies",
    color: '#F59E0B'
  },
  {
    id: 'building-placement',
    name: 'Building Placement',
    description: 'Optimal zones considering all factors',
    icon: MapPin,
    query: 'Recommend optimal building placement considering solar exposure, wind, slope, views, and site access',
    color: '#8B5CF6'
  },
  {
    id: 'sustainability',
    name: 'Sustainability Score',
    description: 'Transit, green space, solar, walkability',
    icon: Zap,
    query: "Calculate sustainability score based on transit access, green space, solar potential, and walkability",
    color: '#10B981'
  },
  {
    id: 'constraints',
    name: 'Development Constraints',
    description: 'Slopes, shadows, access issues',
    icon: Building2,
    query: 'Identify development constraints: steep slopes, shadow zones, access limitations, and challenging areas',
    color: '#EF4444'
  }
];

interface AnalysisTemplatesProps {
  onTemplateSelect: (query: string) => void;
  disabled?: boolean;
}

export const AnalysisTemplates = ({ onTemplateSelect, disabled }: AnalysisTemplatesProps) => {
  return (
    <div className="space-y-1.5">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <Button
            key={template.id}
            variant="ghost"
            className="h-auto p-2 w-full justify-start text-left hover:bg-muted/50 transition-smooth"
            onClick={() => onTemplateSelect(template.query)}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 w-full">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${template.color}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: template.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">
                  {template.name}
                </p>
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
};
