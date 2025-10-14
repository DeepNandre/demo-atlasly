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
    <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-8">
              <div className="relative mx-auto">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Chat with SiteIQ AI</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                  Ask questions about <span className="font-semibold text-primary">{locationName}</span> or request visualizations and analysis
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-3xl mx-auto">
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border-dashed"
                  onClick={() => setInput('What are the climate conditions for this site? Include temperature, rainfall, and wind patterns.')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Climate Analysis</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Weather patterns & data</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all border-dashed"
                  onClick={() => setInput('Generate a realistic architectural visualization of this site showing potential development')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">AI Visualization</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Render site concepts</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all border-dashed"
                  onClick={() => setInput('Provide building recommendations based on the site analysis, considering solar exposure, terrain, and local regulations.')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Building Recommendations</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Site-specific guidance</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="group justify-start h-auto py-4 px-5 text-left hover:border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all border-dashed"
                  onClick={() => setInput('Analyze the solar potential including shadow patterns, sun exposure hours, and optimal panel placement areas.')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Solar Analysis</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Sun exposure & shadows</div>
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/20">
                  <span className="text-primary font-bold text-sm">SI</span>
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap leading-relaxed m-0 text-sm">{message.content}</p>
                </div>
                {message.image_url && (
                  <div className="mt-4">
                    <img
                      src={message.image_url}
                      alt="Generated visualization"
                      className="rounded-xl max-w-full shadow-lg border border-gray-200 dark:border-gray-700"
                    />
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700">
                        <ImageIcon className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm">U</span>
                </div>
              )}
            </div>
          ))}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
              className="flex-shrink-0 h-8 px-3 text-xs bg-primary/5 border-primary/30 hover:bg-primary/10 text-primary"
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Generate a visualization ')}
              className="flex-shrink-0 h-8 px-3 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200"
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              Visualize
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Solar analysis ')}
              className="flex-shrink-0 h-8 px-3 text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200"
            >
              <Sun className="w-3 h-3 mr-1" />
              Solar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Climate analysis ')}
              className="flex-shrink-0 h-8 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Climate
            </Button>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask SiteIQ about ${locationName} or request visualizations...`}
                className="min-h-[60px] max-h-[200px] resize-none bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-colors pr-12"
                disabled={isLoading || isGeneratingImage}
              />
              {(isLoading || isGeneratingImage) && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isGeneratingImage}
              className="px-6 h-auto min-h-[60px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
            >
              {isLoading || isGeneratingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press Enter to send • Shift+Enter for new line
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
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
