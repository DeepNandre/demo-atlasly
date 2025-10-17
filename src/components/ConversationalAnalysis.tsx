import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnalysisCard } from './AnalysisCard';
import { EnvironmentalDataCard } from './EnvironmentalDataCard';

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
}

const ConversationalAnalysis = ({ 
  siteRequestId, 
  locationName, 
  templateQuery,
  onQueryProcessed,
  onLayerCreated
}: ConversationalAnalysisProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const suggestedQuestions = [
    "Analyze transport accessibility",
    "Calculate green space percentage",
    "Find nearby schools and hospitals",
    "What's the optimal building orientation?",
    "Analyze land use composition"
  ];

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
          include_context: true
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

      setMessages(prev => [...prev, assistantMessage]);
      setActiveAnalysis([]);
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
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-3 mt-2">
            <div className="px-2">
              <p className="text-sm text-muted-foreground">
                Ask me anything about this site. I can help with analysis, insights, and recommendations.
              </p>
            </div>
            <div className="space-y-1.5 px-2">
              {suggestedQuestions.slice(0, 4).map((q, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-2 text-xs hover:bg-muted/50"
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
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg p-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto max-w-[85%]'
                        : 'bg-muted text-foreground max-w-[90%]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
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
      <div className="p-3 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about this site..."
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="sm"
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
