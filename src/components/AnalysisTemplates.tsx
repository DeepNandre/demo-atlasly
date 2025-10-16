import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    id: 'transport',
    name: 'Transport Access',
    description: 'Analyze public transit and accessibility',
    icon: Bus,
    query: 'Analyze transport accessibility for this site',
    color: '#1E90FF'
  },
  {
    id: 'green-space',
    name: 'Green Space',
    description: 'Calculate parks and green areas',
    icon: TreePine,
    query: 'Calculate green space percentage and nearby parks',
    color: '#00FF00'
  },
  {
    id: 'amenities',
    name: 'Amenities',
    description: 'Find schools, hospitals, services',
    icon: School,
    query: 'Find nearby schools, hospitals, and essential amenities',
    color: '#FF6347'
  },
  {
    id: 'land-use',
    name: 'Land Use',
    description: 'Analyze zoning and composition',
    icon: MapPin,
    query: 'Analyze land use composition and zoning',
    color: '#FF69B4'
  },
  {
    id: 'density',
    name: 'Density Analysis',
    description: 'Building and population metrics',
    icon: Building2,
    query: 'Analyze building density and population metrics',
    color: '#FFD700'
  },
  {
    id: 'sustainability',
    name: 'Sustainability',
    description: 'Solar, climate, green strategies',
    icon: Zap,
    query: "Analyze the site's sustainability potential and solar orientation",
    color: '#75C34D'
  },
  {
    id: 'feasibility',
    name: 'Feasibility',
    description: 'Development potential assessment',
    icon: TrendingUp,
    query: 'Assess development feasibility and constraints',
    color: '#4169E1'
  }
];

interface AnalysisTemplatesProps {
  onTemplateSelect: (query: string) => void;
  disabled?: boolean;
}

export const AnalysisTemplates = ({ onTemplateSelect, disabled }: AnalysisTemplatesProps) => {
  return (
    <Card className="h-full flex flex-col bg-card border-border">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-foreground">Quick Analysis</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Pre-built analysis templates
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-1 gap-3">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Button
                key={template.id}
                variant="outline"
                className="h-auto p-3 justify-start text-left hover:bg-muted/50 transition-smooth"
                onClick={() => onTemplateSelect(template.query)}
                disabled={disabled}
              >
                <div className="flex items-start gap-3 w-full">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: template.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {template.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.description}
                    </p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
};
