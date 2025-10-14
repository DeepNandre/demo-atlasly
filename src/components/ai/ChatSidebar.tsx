import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Search, Pin, MoreHorizontal, Edit3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatHistory {
  id: string;
  created_at: string;
  site_request_id: string;
  first_message: string;
  message_count?: number;
  last_message_at?: string;
  title?: string;
  is_pinned?: boolean;
}

interface ChatSidebarProps {
  activeChatId: string | null;
  onChatSelect: (chatId: string | null) => void;
  onNewChat: () => void;
  siteRequestId?: string;
}

const ChatSidebar = ({ activeChatId, onChatSelect, onNewChat, siteRequestId }: ChatSidebarProps) => {
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (siteRequestId) {
      loadChatHistory();
    }
  }, [siteRequestId]);

  const loadChatHistory = async () => {
    if (!siteRequestId) return;

    setIsLoading(true);
    try {
      // Get all messages for this site
      const { data, error } = await supabase
        .from('ai_logs')
        .select('id, created_at, site_request_id, content, role')
        .eq('site_request_id', siteRequestId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      // Group conversations by time gaps (> 1 hour = new conversation)
      const conversations: { [key: string]: any[] } = {};
      let currentConversationId = '';
      let lastMessageTime = 0;

      data?.forEach((msg) => {
        const messageTime = new Date(msg.created_at).getTime();
        const timeDiff = messageTime - lastMessageTime;
        
        // New conversation if > 1 hour gap or first message
        if (timeDiff > 3600000 || !currentConversationId) {
          currentConversationId = msg.id;
          conversations[currentConversationId] = [];
        }
        
        conversations[currentConversationId].push(msg);
        lastMessageTime = messageTime;
      });

      // Convert to ChatHistory format
      const grouped: ChatHistory[] = Object.entries(conversations).map(([id, messages]) => {
        const firstUserMessage = messages.find(m => m.role === 'user');
        const lastMessage = messages[messages.length - 1];
        
        return {
          id,
          created_at: messages[0].created_at,
          site_request_id: siteRequestId,
          first_message: firstUserMessage?.content?.slice(0, 60) + (firstUserMessage?.content?.length > 60 ? '...' : '') || 'New conversation',
          message_count: messages.length,
          last_message_at: lastMessage.created_at,
          title: generateConversationTitle(firstUserMessage?.content || ''),
          is_pinned: false
        };
      }).sort((a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime());

      setChats(grouped);
    } finally {
      setIsLoading(false);
    }
  };

  const generateConversationTitle = (firstMessage: string): string => {
    if (firstMessage.toLowerCase().includes('visualiz')) return '🎨 Visualization';
    if (firstMessage.toLowerCase().includes('solar')) return '☀️ Solar Analysis';
    if (firstMessage.toLowerCase().includes('climate')) return '🌤️ Climate Data';
    if (firstMessage.toLowerCase().includes('building')) return '🏗️ Building Analysis';
    if (firstMessage.toLowerCase().includes('site')) return '📍 Site Planning';
    return '💬 General Chat';
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

  const filteredChats = chats.filter(chat => 
    chat.first_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupChatsByDate = (chats: ChatHistory[]) => {
    const groups: { [key: string]: ChatHistory[] } = {};
    
    chats.forEach(chat => {
      const date = new Date(chat.last_message_at || chat.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey = '';
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        groupKey = 'This Week';
      } else {
        groupKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(chat);
    });
    
    return groups;
  };

  const chatGroups = groupChatsByDate(filteredChats);

  return (
    <div className="w-64 border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="p-3 border-b">
        <Button
          onClick={onNewChat}
          className="w-full gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
        
        <div className="relative mt-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : Object.keys(chatGroups).length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No conversations yet</p>
          </div>
        ) : (
          Object.entries(chatGroups).map(([groupName, groupChats]) => (
            <div key={groupName} className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">
                {groupName}
              </h3>
              
              <div className="space-y-1">
                {groupChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => onChatSelect(chat.id)}
                    className={`group p-2 rounded-lg cursor-pointer transition-colors ${
                      activeChatId === chat.id
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-medium truncate">
                            {chat.title || chat.first_message}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(chat.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
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
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-xs">SI</span>
          </div>
          <span className="font-medium text-xs">SiteIQ AI</span>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
