import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatHistory {
  id: string;
  created_at: string;
  site_request_id: string;
  first_message: string;
}

interface ChatSidebarProps {
  activeChatId: string | null;
  onChatSelect: (chatId: string | null) => void;
  onNewChat: () => void;
  siteRequestId?: string;
}

const ChatSidebar = ({ activeChatId, onChatSelect, onNewChat, siteRequestId }: ChatSidebarProps) => {
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (siteRequestId) {
      loadChatHistory();
    }
  }, [siteRequestId]);

  const loadChatHistory = async () => {
    if (!siteRequestId) return;

    const { data, error } = await supabase
      .from('ai_logs')
      .select('id, created_at, site_request_id, content')
      .eq('site_request_id', siteRequestId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading chat history:', error);
      return;
    }

    // Group by conversation (assuming messages within 1 hour are same conversation)
    const grouped: ChatHistory[] = [];
    data?.forEach((msg) => {
      if (!grouped.find(g => g.id === msg.id)) {
        grouped.push({
          id: msg.id,
          created_at: msg.created_at,
          site_request_id: msg.site_request_id,
          first_message: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
        });
      }
    });

    setChats(grouped);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('ai_logs')
      .delete()
      .eq('id', chatId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
      return;
    }

    setChats(chats.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      onChatSelect(null);
    }

    toast({
      title: 'Success',
      description: 'Chat deleted',
    });
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                activeChatId === chat.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {chat.first_message}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(chat.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          {chats.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No chat history yet
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold">AI</span>
          </div>
          <span className="font-medium">SiteIQ AI</span>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
