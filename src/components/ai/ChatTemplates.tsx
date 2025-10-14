import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Sun, 
  BarChart3, 
  MapPin, 
  Building2, 
  TreePine, 
  Zap, 
  FileText, 
  Camera,
  TrendingUp,
  Shield,
  Droplets,
  Wind
} from 'lucide-react';

interface ChatTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'analysis' | 'visualization' | 'planning' | 'insights';
  icon: React.ReactNode;
  tags: string[];
}

interface ChatTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

const templates: ChatTemplate[] = [
  // Analysis Templates
  {
    id: 'solar-comprehensive',
    title: 'Comprehensive Solar Analysis',
    description: 'Deep dive into solar potential with shadow patterns and optimal placement recommendations',
    prompt: 'Perform a comprehensive solar analysis for this site including:\n- Shadow patterns throughout the day\n- Annual sun exposure calculations\n- Optimal solar panel placement areas\n- Seasonal variations and considerations\n- ROI estimates for solar installation',
    category: 'analysis',
    icon: <Sun className="w-4 h-4" />,
    tags: ['solar', 'energy', 'analysis']
  },
  {
    id: 'climate-assessment',
    title: 'Climate & Weather Assessment',
    description: 'Complete climate analysis with implications for building design',
    prompt: 'Analyze the climate conditions for this site including:\n- Temperature patterns and extremes\n- Rainfall and precipitation data\n- Wind patterns and directions\n- Humidity and comfort considerations\n- Climate change projections\n- Recommended building design adaptations',
    category: 'analysis',
    icon: <BarChart3 className="w-4 h-4" />,
    tags: ['climate', 'weather', 'design']
  },
  {
    id: 'topography-analysis',
    title: 'Topography & Drainage Analysis',
    description: 'Terrain analysis with drainage and construction considerations',
    prompt: 'Analyze the topography and terrain for this site:\n- Elevation changes and slope analysis\n- Drainage patterns and water flow\n- Cut and fill requirements\n- Foundation considerations\n- Accessibility and grading needs\n- Soil stability assessment',
    category: 'analysis',
    icon: <MapPin className="w-4 h-4" />,
    tags: ['terrain', 'drainage', 'construction']
  },

  // Visualization Templates
  {
    id: 'architectural-render',
    title: 'Architectural Rendering',
    description: 'Photorealistic visualization showing potential development',
    prompt: 'Generate a photorealistic architectural rendering of this site showing:\n- Modern sustainable building design\n- Integration with existing topography\n- Landscaping and outdoor spaces\n- Solar panels and green features\n- Proper scale and context with surroundings',
    category: 'visualization',
    icon: <Building2 className="w-4 h-4" />,
    tags: ['rendering', 'architecture', 'design']
  },
  {
    id: 'landscape-design',
    title: 'Landscape Design Visualization',
    description: 'Natural landscape integration and outdoor space design',
    prompt: 'Create a landscape design visualization showing:\n- Native plant integration\n- Sustainable water features\n- Outdoor recreational spaces\n- Natural habitat preservation\n- Erosion control and stabilization\n- Seasonal color and texture variations',
    category: 'visualization',
    icon: <TreePine className="w-4 h-4" />,
    tags: ['landscape', 'nature', 'sustainability']
  },
  {
    id: 'aerial-masterplan',
    title: 'Aerial Master Plan',
    description: 'Bird\'s eye view showing complete site development plan',
    prompt: 'Generate an aerial master plan visualization showing:\n- Complete site layout and buildings\n- Transportation and access routes\n- Utility infrastructure placement\n- Green spaces and conservation areas\n- Parking and service areas\n- Integration with surrounding development',
    category: 'visualization',
    icon: <Camera className="w-4 h-4" />,
    tags: ['masterplan', 'aerial', 'planning']
  },

  // Planning Templates
  {
    id: 'development-strategy',
    title: 'Development Strategy',
    description: 'Comprehensive development approach and phasing plan',
    prompt: 'Develop a comprehensive development strategy for this site:\n- Optimal building placement and orientation\n- Phased development approach\n- Infrastructure requirements\n- Regulatory compliance considerations\n- Environmental impact mitigation\n- Community integration strategies',
    category: 'planning',
    icon: <TrendingUp className="w-4 h-4" />,
    tags: ['strategy', 'development', 'phasing']
  },
  {
    id: 'sustainability-plan',
    title: 'Sustainability Planning',
    description: 'Green building and environmental sustainability recommendations',
    prompt: 'Create a sustainability plan for this site including:\n- Energy efficiency strategies\n- Water conservation systems\n- Waste management solutions\n- Carbon footprint reduction\n- LEED/BREEAM certification pathways\n- Long-term environmental benefits',
    category: 'planning',
    icon: <Shield className="w-4 h-4" />,
    tags: ['sustainability', 'green', 'efficiency']
  },

  // Insights Templates
  {
    id: 'market-analysis',
    title: 'Market & Economic Insights',
    description: 'Property value and market potential analysis',
    prompt: 'Provide market and economic insights for this site:\n- Current property values in the area\n- Development potential and ROI\n- Market demand for different property types\n- Infrastructure investment requirements\n- Long-term appreciation potential\n- Risk factors and mitigation strategies',
    category: 'insights',
    icon: <TrendingUp className="w-4 h-4" />,
    tags: ['market', 'economics', 'value']
  },
  {
    id: 'utility-infrastructure',
    title: 'Utility Infrastructure Assessment',
    description: 'Power, water, and connectivity infrastructure analysis',
    prompt: 'Assess utility infrastructure requirements for this site:\n- Electrical grid connectivity and capacity\n- Water supply and sewage systems\n- Internet and telecommunications access\n- Gas and heating infrastructure\n- Storm water management\n- Future utility upgrade potential',
    category: 'insights',
    icon: <Zap className="w-4 h-4" />,
    tags: ['utilities', 'infrastructure', 'connectivity']
  }
];

export function ChatTemplates({ onSelectTemplate, isVisible, onClose }: ChatTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = [
    { id: 'all', label: 'All Templates', count: templates.length },
    { id: 'analysis', label: 'Analysis', count: templates.filter(t => t.category === 'analysis').length },
    { id: 'visualization', label: 'Visualization', count: templates.filter(t => t.category === 'visualization').length },
    { id: 'planning', label: 'Planning', count: templates.filter(t => t.category === 'planning').length },
    { id: 'insights', label: 'Insights', count: templates.filter(t => t.category === 'insights').length },
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[80vh] flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Chat Templates</h2>
              <p className="text-muted-foreground mt-1">
                Choose from expert-crafted prompts to get the most out of SiteIQ AI
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0"
              >
                {category.label}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id}
                className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/20"
                onClick={() => {
                  onSelectTemplate(template.prompt);
                  onClose();
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{template.title}</h3>
                    <Badge 
                      variant="secondary" 
                      className="text-xs mt-1 capitalize"
                    >
                      {template.category}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="text-xs px-2 py-0.5"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}