import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Image as ImageIcon, Sparkles, Sun, BarChart3, MapPin, Zap, FileText, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChatTemplates } from './ChatTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
}

interface ChatInterfaceProps {
  siteRequestId: string;
  locationName: string;
  chatId: string | null;
  onChatIdChange: (chatId: string) => void;
}

const ChatInterface = ({ siteRequestId, locationName, chatId, onChatIdChange }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chatId) {
      loadChatMessages();
    } else {
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadChatMessages = async () => {
    if (!chatId) return;

    const { data, error } = await supabase
      .from('ai_logs')
      .select('*')
      .eq('site_request_id', siteRequestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const formattedMessages: Message[] = (data || []).map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      created_at: msg.created_at,
    }));

    setMessages(formattedMessages);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Check if user wants to generate a visualization
      const isVisualizationRequest = 
        userMessage.toLowerCase().includes('visualiz') ||
        userMessage.toLowerCase().includes('render') ||
        userMessage.toLowerCase().includes('image') ||
        userMessage.toLowerCase().includes('picture');

      if (isVisualizationRequest) {
        await generateVisualization(userMessage);
      } else {
        await chatWithAI(userMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const chatWithAI = async (userMessage: string) => {
    // Add user message to UI
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Stream AI response
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-assistant-stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          site_request_id: siteRequestId,
          question: userMessage,
        }),
      }
    );

    if (!response.ok) throw new Error('Failed to get AI response');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantContent = '';

    const tempAssistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempAssistantMsg]);

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === tempAssistantMsg.id 
                    ? { ...msg, content: assistantContent }
                    : msg
                )
              );
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    if (!chatId && assistantContent) {
      onChatIdChange(tempUserMsg.id);
    }
  };

  const generateVisualization = async (prompt: string) => {
    setIsGeneratingImage(true);

    // Add user message
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Add loading message
    const loadingMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Generating visualization...',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      // Call visualization generation (you'll need to adapt this based on your existing implementation)
      const { data, error } = await supabase.functions.invoke('generate-visualization', {
        body: {
          siteRequestId,
          style: 'realistic',
          prompt: prompt,
          imageBase64: '', // You might need to handle this differently
        },
      });

      if (error) throw error;

      // Update message with image
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMsg.id
            ? {
                ...msg,
                content: 'Here\'s your visualization:',
                image_url: data.result?.output_url,
              }
            : msg
        )
      );

      if (!chatId) {
        onChatIdChange(tempUserMsg.id);
      }
    } catch (error) {
      console.error('Error generating visualization:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMsg.id
            ? { ...msg, content: 'Failed to generate visualization. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20 space-y-8">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold">Chat with SiteIQ AI</h2>
                <p className="text-muted-foreground text-lg">
                  Ask questions about {locationName} or request visualizations
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-12 max-w-3xl mx-auto">
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all border-dashed"
                  onClick={() => setInput('What are the climate conditions for this site? Include temperature, rainfall, and wind patterns.')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Climate Analysis</div>
                      <div className="text-xs text-muted-foreground">Weather patterns & data</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all border-dashed"
                  onClick={() => setInput('Generate a realistic architectural visualization of this site showing potential development')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">AI Visualization</div>
                      <div className="text-xs text-muted-foreground">Render site concepts</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all border-dashed"
                  onClick={() => setInput('Provide building recommendations based on the site analysis, considering solar exposure, terrain, and local regulations.')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Building Recommendations</div>
                      <div className="text-xs text-muted-foreground">Site-specific guidance</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all border-dashed"
                  onClick={() => setInput('Analyze the solar potential including shadow patterns, sun exposure hours, and optimal panel placement areas.')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sun className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Solar Analysis</div>
                      <div className="text-xs text-muted-foreground">Sun exposure & shadows</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all border-dashed"
                  onClick={() => setInput('Generate a comprehensive site analysis report including elevation, terrain features, and development constraints.')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Site Report</div>
                      <div className="text-xs text-muted-foreground">Comprehensive analysis</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all border-dashed"
                  onClick={() => setInput('What are the key insights and recommendations for developing this site sustainably?')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Key Insights</div>
                      <div className="text-xs text-muted-foreground">Development strategy</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                  <span className="text-primary font-bold text-sm">SI</span>
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/70 backdrop-blur-sm border border-border/50'
                }`}
              >
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed m-0">{message.content}</p>
                </div>
                {message.image_url && (
                  <div className="mt-4">
                    <img
                      src={message.image_url}
                      alt="Generated visualization"
                      className="rounded-xl max-w-full shadow-lg border border-border/20"
                    />
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        <ImageIcon className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 border border-accent-foreground/20">
                  <span className="text-accent-foreground font-semibold text-sm">U</span>
                </div>
              )}
            </div>
          ))}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-6">
        <div className="max-w-5xl mx-auto">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 h-8 px-3 text-xs bg-primary/5 border-primary/30 hover:bg-primary/10"
              onClick={() => setShowTemplates(true)}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 h-8 px-3 text-xs"
              onClick={() => setInput('Generate a visualization ')}
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              Visualize
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 h-8 px-3 text-xs"
              onClick={() => setInput('Run solar analysis ')}
            >
              <Sun className="w-3 h-3 mr-1" />
              Solar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 h-8 px-3 text-xs"
              onClick={() => setInput('Show climate data ')}
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Climate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 h-8 px-3 text-xs"
              onClick={() => setInput('Export site analysis ')}
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask SiteIQ about ${locationName} or request visualizations...`}
                className="min-h-[60px] max-h-[200px] resize-none bg-background/60 border-border/50 pr-12"
                disabled={isLoading || isGeneratingImage}
              />
              {(isLoading || isGeneratingImage) && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isGeneratingImage}
              size="lg"
              className="px-6 h-auto min-h-[60px] shadow-sm"
            >
              {isLoading || isGeneratingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              Press Enter to send • Shift+Enter for new line
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Powered by SiteIQ AI</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Templates Modal */}
      <ChatTemplates
        isVisible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={(prompt) => setInput(prompt)}
      />
    </div>
  );
};

export default ChatInterface;
