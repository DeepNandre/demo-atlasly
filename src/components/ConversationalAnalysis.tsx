import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Sparkles, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationalAnalysisProps {
  siteRequestId: string;
  locationName: string;
}

const ConversationalAnalysis = ({ siteRequestId, locationName }: ConversationalAnalysisProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const suggestedQuestions = [
    "What's the optimal building orientation for solar gain?",
    "Analyze the site's sustainability potential",
    "How can I minimize site preparation costs?",
    "What zoning considerations should I be aware of?",
    "Recommend passive design strategies for this climate"
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

    try {
      const { data, error } = await supabase.functions.invoke('conversational-analysis', {
        body: {
          site_request_id: siteRequestId,
          query: message,
          include_context: true
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  return (
    <div className="flex flex-col h-full">
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
              <div
                key={i}
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
            ))}
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
