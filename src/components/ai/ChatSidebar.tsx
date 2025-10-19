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

const AtlaslyLogo = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M3 12L6 9L9 12L12 9L15 12L18 9L21 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 16L6 13L9 16L12 13L15 16L18 13L21 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 8L6 5L9 8L12 5L15 8L18 5L21 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
    <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <Button
          onClick={onNewChat}
          className="w-full gap-2 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg"
          size="default"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
        
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 transition-colors"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
          </div>
        ) : Object.keys(chatGroups).length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No conversations yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Start a new chat to begin</p>
          </div>
        ) : (
          Object.entries(chatGroups).map(([groupName, groupChats]) => (
            <div key={groupName} className="mb-6">
              <div className="flex items-center gap-2 px-3 py-2 mb-3">
                <Calendar className="w-3 h-3 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {groupName}
                </h3>
              </div>
              
              <div className="space-y-1">
                {groupChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => onChatSelect(chat.id)}
                    className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      activeChatId === chat.id
                        ? 'bg-primary/10 border border-primary/20 shadow-sm'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {chat.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white leading-none truncate">
                            {chat.title || chat.first_message}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                          {chat.first_message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {new Date(chat.last_message_at || chat.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          {chat.message_count && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                              {chat.message_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="gap-2">
                            <Edit3 className="w-3 h-3" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Pin className="w-3 h-3" />
                            {chat.is_pinned ? 'Unpin' : 'Pin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-red-600 focus:text-red-600 dark:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChat(chat.id, e);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
            <AtlaslyLogo className="text-primary" size={16} />
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">Atlasly AI</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Intelligent Analysis</div>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
