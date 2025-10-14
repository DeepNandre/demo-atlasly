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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:bg-gray-950/80 dark:supports-[backdrop-filter]:bg-gray-950/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">SI</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-950 animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">SiteIQ AI</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Intelligent Site Analysis</p>
                </div>
              </div>
              
              <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
              
              {/* Project Selector */}
              <div className="hidden lg:flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Project</span>
                <ProjectSelector
                  sites={sites}
                  selectedSite={selectedSite}
                  onSiteSelect={setSelectedSite}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-3">
              {selectedSite && (
                <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700 dark:text-green-300 capitalize">
                    {selectedSite.status}
                  </span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex"
              >
                Dashboard
              </Button>
            </div>
          </div>
          
          {/* Mobile Project Selector */}
          <div className="lg:hidden mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Project:</span>
              <ProjectSelector
                sites={sites}
                selectedSite={selectedSite}
                onSiteSelect={setSelectedSite}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-5rem)] lg:h-[calc(100vh-4.5rem)]">
        {/* Enhanced Sidebar */}
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
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-6 max-w-lg">
              <div className="relative mx-auto">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-3xl font-bold text-primary">SI</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to SiteIQ AI</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  Your intelligent site analysis assistant is ready to help. Select a project to get started with insights, recommendations, and visualizations.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button 
                  onClick={() => navigate('/generate')}
                  size="lg"
                  className="w-full sm:w-auto shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
                
                {sites.length > 0 && (
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={() => setSelectedSite(sites[0])}
                    className="w-full sm:w-auto"
                  >
                    Use Existing Project
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAI;
