import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ChatSidebar from '@/components/ai/ChatSidebar';
import ChatInterface from '@/components/ai/ChatInterface';
import ProjectSelector from '@/components/ai/ProjectSelector';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface SiteRequest {
  id: string;
  location_name: string;
  created_at: string;
  status: string;
}

const SiteAI = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSite, setSelectedSite] = useState<SiteRequest | null>(null);
  const [sites, setSites] = useState<SiteRequest[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadUserSites();
  }, [user, navigate]);

  const loadUserSites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('site_requests')
      .select('id, location_name, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading sites:', error);
      return;
    }

    setSites(data || []);
    
    // Auto-select first site if none selected
    if (!selectedSite && data && data.length > 0) {
      setSelectedSite(data[0]);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Standard Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <span className="hidden font-bold sm:inline-block">SiteIQ AI</span>
            </a>
          </div>
          <div className="flex flex-1 items-center space-x-2">
            <ProjectSelector
              sites={sites}
              selectedSite={selectedSite}
              onSiteSelect={setSelectedSite}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Chat History Sidebar */}
        <ChatSidebar
          activeChatId={activeChatId}
          onChatSelect={setActiveChatId}
          onNewChat={handleNewChat}
          siteRequestId={selectedSite?.id}
        />

        {/* Chat Interface */}
        {selectedSite ? (
          <ChatInterface
            siteRequestId={selectedSite.id}
            locationName={selectedSite.location_name}
            chatId={activeChatId}
            onChatIdChange={setActiveChatId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">SI</span>
              </div>
              <h2 className="text-2xl font-semibold">Welcome to SiteIQ AI</h2>
              <p className="text-muted-foreground">
                Select a project to start chatting with your intelligent site analysis assistant.
              </p>
              <Button 
                onClick={() => navigate('/generate')}
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAI;
