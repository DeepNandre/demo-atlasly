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
    <div className="flex-1 flex flex-col">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Chat with SiteIQ AI</h2>
                <p className="text-muted-foreground">
                  Ask questions about {locationName} or request visualizations
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-2xl mx-auto">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left"
                  onClick={() => setInput('What are the climate conditions for this site?')}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Climate Analysis</span>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left"
                  onClick={() => setInput('Generate a visualization of this site')}
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">AI Visualization</span>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left"
                  onClick={() => setInput('What building recommendations do you have?')}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Building Recommendations</span>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left"
                  onClick={() => setInput('Analyze the solar potential')}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Solar Analysis</span>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">AI</span>
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                {message.image_url && (
                  <div className="mt-3">
                    <img
                      src={message.image_url}
                      alt="Generated visualization"
                      className="rounded-lg max-w-full"
                    />
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-foreground font-semibold text-sm">U</span>
                </div>
              )}
            </div>
          ))}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Generate a visualization ')}
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              Visualize
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Solar analysis ')}
            >
              <Sun className="w-3 h-3 mr-1" />
              Solar
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${locationName}...`}
              className="min-h-[50px] max-h-[150px] resize-none"
              disabled={isLoading || isGeneratingImage}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isGeneratingImage}
              className="px-4"
            >
              {isLoading || isGeneratingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
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
