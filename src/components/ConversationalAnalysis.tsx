import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Sparkles, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnalysisCard } from './AnalysisCard';

interface AnalysisResult {
  title: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  results?: { metric: string; value: string | number }[];
  insights?: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysisCards?: AnalysisResult[];
}

interface ConversationalAnalysisProps {
  siteRequestId: string;
  locationName: string;
  templateQuery?: string | null;
  onQueryProcessed?: () => void;
}

const ConversationalAnalysis = ({ 
  siteRequestId, 
  locationName, 
  templateQuery,
  onQueryProcessed 
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
      if (analysisCards.length > 0 && data.metrics) {
        setActiveAnalysis(prev => 
          prev.map(card => ({
            ...card,
            status: 'complete' as const,
            results: data.metrics[card.title.toLowerCase().replace(/\s+/g, '_')] || card.results,
            insights: data.insights || card.insights
          }))
        );
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        analysisCards: activeAnalysis.length > 0 ? activeAnalysis : undefined
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
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
              <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium mb-2">
                  Welcome to AI-Powered Site Analysis
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  Ask me anything about this site. I can help with solar optimization, sustainability strategies, cost planning, and design recommendations.
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3 text-xs"
                      onClick={() => sendMessage(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
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
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {msg.analysisCards && msg.analysisCards.length > 0 && (
                  <div className="ml-11 space-y-2">
                    {msg.analysisCards.map((card, idx) => (
                      <AnalysisCard key={idx} {...card} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {activeAnalysis.length > 0 && (
              <div className="ml-11 space-y-2">
                {activeAnalysis.map((card, idx) => (
                  <AnalysisCard key={idx} {...card} />
                ))}
              </div>
            )}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
                <div className="bg-muted border border-border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Analyzing...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about this site..."
            disabled={isLoading}
            className="flex-1 bg-background"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Powered by multi-source data analysis
        </p>
      </div>
    </div>
  );
};

export default ConversationalAnalysis;
