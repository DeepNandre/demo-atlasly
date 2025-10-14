import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ChatSidebar from '@/components/ai/ChatSidebar';
import ChatInterface from '@/components/ai/ChatInterface';
import ProjectSelector from '@/components/ai/ProjectSelector';
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
    <div className="flex h-screen bg-background">
      {/* Chat History Sidebar */}
      <ChatSidebar
        activeChatId={activeChatId}
        onChatSelect={setActiveChatId}
        onNewChat={handleNewChat}
        siteRequestId={selectedSite?.id}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Project Selector Header */}
        <ProjectSelector
          sites={sites}
          selectedSite={selectedSite}
          onSiteSelect={setSelectedSite}
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🏗️</div>
              <h2 className="text-2xl font-semibold text-foreground">Welcome to SiteIQ AI</h2>
              <p className="text-lg">Select a project to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAI;
