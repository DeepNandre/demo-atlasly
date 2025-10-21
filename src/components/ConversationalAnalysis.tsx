import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnalysisCard } from './AnalysisCard';
import { EnvironmentalDataCard } from './EnvironmentalDataCard';
import { AnalysisTemplates } from './AnalysisTemplates';

interface AnalysisResult {
  title: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  results?: { metric: string; value: string | number }[];
  insights?: string[];
  layerData?: {
    id: string;
    name: string;
    color: string;
    objectCount: number;
    dataSource: string;
    geojson?: any;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysisCards?: AnalysisResult[];
  environmentalData?: any;
}

interface ConversationalAnalysisProps {
  siteRequestId: string;
  locationName: string;
  templateQuery?: string | null;
  onQueryProcessed?: () => void;
  onLayerCreated?: (layer: any) => void;
  activeTab?: string;
  siteData?: any;
  onTemplateSelect?: (query: string) => void;
}

// Simple markdown formatter to convert markdown to clean HTML
const formatMarkdown = (text: string): string => {
  let html = text;
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert bullet lists (lines starting with * or -)
  html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> items in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Convert line breaks to <br> but preserve paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

const ConversationalAnalysis = ({ 
  siteRequestId, 
  locationName, 
  templateQuery,
  onQueryProcessed,
  onLayerCreated,
  activeTab,
  siteData,
  onTemplateSelect
}: ConversationalAnalysisProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (templateQuery) {
      sendMessage(templateQuery);
      onQueryProcessed?.();
    }
  }, [templateQuery]);

  // Context-aware suggested questions based on active tab
  const getSuggestedQuestions = () => {
    switch (activeTab) {
      case 'model':
        return [
          "How many buildings are on this site?",
          "Analyze walkability and pedestrian access",
          "What's the road network connectivity?",
          "Calculate building density"
        ];
      case 'solar':
        return [
          "What's the optimal building orientation for solar?",
          "Analyze shadow patterns on the site",
          "Calculate solar panel potential",
          "Which areas get the most sun exposure?"
        ];
      case 'climate':
        return [
          "Recommend passive design strategies",
          "How do prevailing winds affect the site?",
          "What's the best orientation for natural ventilation?",
          "Analyze thermal comfort zones"
        ];
      default:
        return [
          "Provide a complete site assessment",
          "What are the main development opportunities?",
          "Analyze sustainability score",
          "Recommend optimal building placement"
        ];
    }
  };

  const suggestedQuestions = getSuggestedQuestions();

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Show analysis cards based on query type
    const analysisCards = getAnalysisCardsForQuery(message);
    if (analysisCards.length > 0) {
      setActiveAnalysis(analysisCards.map(card => ({ ...card, status: 'analyzing' as const })));
    }

    try {
      const { data, error } = await supabase.functions.invoke('conversational-analysis', {
        body: {
          site_request_id: siteRequestId,
          query: message,
          include_context: true,
          active_tab: activeTab
        }
      });

      if (error) throw error;

      // Update analysis cards to complete
      const completedCards = analysisCards.map((card, idx) => ({
        ...card,
        status: 'complete' as const,
        results: data.metrics?.[card.title.toLowerCase().replace(/\s+/g, '_')] || card.results,
        insights: data.insights || card.insights,
        layerData: data.layers?.[idx] // AI can generate layer data
      }));
      
      // Extract environmental/chart data if available
      let environmentalChartData = null;
      if (data.layers && data.layers.length > 0) {
        const layerWithCharts = data.layers.find((l: any) => l.chartData);
        if (layerWithCharts) {
          environmentalChartData = layerWithCharts.chartData;
          console.log('Found environmental chart data:', environmentalChartData);
        }
      }
      
      // Create layers from analysis results
      if (onLayerCreated && completedCards.length > 0) {
        completedCards.forEach((card) => {
          if (card.layerData) {
            onLayerCreated({
              id: card.layerData.id,
              name: card.layerData.name,
              visible: true,
              color: card.layerData.color,
              type: 'ai-generated',
              objectCount: card.layerData.objectCount,
              dataSource: card.layerData.dataSource,
              geojson: card.layerData.geojson
            });
          }
        });
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        analysisCards: completedCards.length > 0 ? completedCards : undefined,
        environmentalData: environmentalChartData
      };

      // Store in state - will persist
      setMessages(prev => [...prev, assistantMessage]);
      setActiveAnalysis([]);
      
      console.log('Message stored with environmental data:', assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: 'destructive'
      });

      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAnalysisCardsForQuery = (query: string): AnalysisResult[] => {
    const lowerQuery = query.toLowerCase();
    const cards: AnalysisResult[] = [];

    if (lowerQuery.includes('transport') || lowerQuery.includes('transit')) {
      cards.push({
        title: 'Transport Accessibility',
        status: 'pending',
        results: [
          { metric: 'Transit Stops', value: '...' },
          { metric: 'Average Distance', value: '...' }
        ]
      });
    }

    if (lowerQuery.includes('green') || lowerQuery.includes('park')) {
      cards.push({
        title: 'Green Space Analysis',
        status: 'pending',
        results: [
          { metric: 'Green Space %', value: '...' },
          { metric: 'Nearest Park', value: '...' }
        ]
      });
    }

    if (lowerQuery.includes('school') || lowerQuery.includes('hospital') || lowerQuery.includes('amenity')) {
      cards.push({
        title: 'Amenity Proximity',
        status: 'pending',
        results: [
          { metric: 'Schools Nearby', value: '...' },
          { metric: 'Hospitals Nearby', value: '...' }
        ]
      });
    }

    if (lowerQuery.includes('land use') || lowerQuery.includes('zoning')) {
      cards.push({
        title: 'Land Use Composition',
        status: 'pending',
        results: [
          { metric: 'Residential %', value: '...' },
          { metric: 'Commercial %', value: '...' }
        ]
      });
    }

    return cards;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4 mt-4">
            <div className="px-3">
              <div className="mb-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Atlasly AI - Your Intelligent Assistant
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I can analyze your site's buildings, roads, solar potential, climate data, and more. I'm aware of what you're viewing and can provide context-specific insights. Ask me anything!
                </p>
              </div>
            </div>
            <div className="space-y-2 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Quick Questions</p>
              {suggestedQuestions.slice(0, 4).map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2.5 px-3 text-xs font-normal hover:bg-primary/5 hover:border-primary/30 transition-all"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className="space-y-3">
                <div
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl p-3 text-sm max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto shadow-md'
                        : 'bg-card text-card-foreground border border-border shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <div 
                        className="whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-headings:mt-3 prose-headings:mb-2 prose-strong:font-semibold prose-strong:text-foreground"
                        dangerouslySetInnerHTML={{ 
                          __html: formatMarkdown(msg.content) 
                        }}
                      />
                    )}
                  </div>
                </div>
                
                {msg.analysisCards && msg.analysisCards.length > 0 && (
                  <div className="ml-9 space-y-2 mt-2">
                    {msg.analysisCards.map((card, idx) => (
                      <AnalysisCard key={idx} {...card} />
                    ))}
                  </div>
                )}
                
                {msg.environmentalData && (
                  <div className="ml-9 mt-2">
                    <EnvironmentalDataCard 
                      environmentalData={msg.environmentalData}
                      dataSource="Open-Meteo API"
                    />
                  </div>
                )}
              </div>
            ))}
            
            {activeAnalysis.length > 0 && (
              <div className="ml-9 space-y-2">
                {activeAnalysis.map((card, idx) => (
                  <AnalysisCard key={idx} {...card} />
                ))}
              </div>
            )}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
                <div className="bg-muted rounded-lg p-2.5 text-sm">
                  <p className="text-muted-foreground">Analyzing...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
            <PopoverTrigger asChild>
              <Button 
                type="button" 
                size="icon" 
                variant="outline"
                className="flex-shrink-0"
                disabled={isLoading}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-80 p-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Analysis Templates</p>
                <AnalysisTemplates
                  onTemplateSelect={(query) => {
                    if (onTemplateSelect) {
                      onTemplateSelect(query);
                    } else {
                      sendMessage(query);
                    }
                    setTemplatesOpen(false);
                  }}
                  disabled={isLoading}
                />
              </div>
            </PopoverContent>
          </Popover>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about this site..."
            disabled={isLoading}
            className="flex-1 text-sm bg-background border-border focus-visible:ring-primary"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="default"
            className="shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConversationalAnalysis;
