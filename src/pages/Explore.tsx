import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, MapPin, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PublicSite {
  id: string;
  location_name: string;
  preview_image_url: string;
  created_at: string;
  views: number;
  likes: number;
  share_card_url: string | null;
}

const Explore = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState<PublicSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'views' | 'likes' | 'recent'>('recent');

  useEffect(() => {
    loadPublicSites();
  }, [sortBy]);

  const loadPublicSites = async () => {
    setIsLoading(true);
    try {
      const { data: shares, error } = await supabase
        .from('site_shares')
        .select(`
          id,
          views,
          likes,
          share_card_url,
          site_request_id,
          created_at,
          site_requests (
            id,
            location_name,
            preview_image_url
          )
        `)
        .eq('is_public', true)
        .order(sortBy === 'views' ? 'views' : sortBy === 'likes' ? 'likes' : 'created_at', 
          { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedSites = (shares || []).map((share: any) => ({
        id: share.site_requests.id,
        location_name: share.site_requests.location_name,
        preview_image_url: share.site_requests.preview_image_url,
        created_at: share.created_at,
        views: share.views,
        likes: share.likes,
        share_card_url: share.share_card_url
      }));

      setSites(formattedSites);
    } catch (error) {
      console.error('Error loading public sites:', error);
      toast.error('Failed to load sites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (siteId: string) => {
    try {
      // Get current share
      const { data: share } = await supabase
        .from('site_shares')
        .select('likes')
        .eq('site_request_id', siteId)
        .single();

      if (!share) return;

      // Increment likes
      const { error } = await supabase
        .from('site_shares')
        .update({ likes: share.likes + 1 })
        .eq('site_request_id', siteId);
      
      if (error) throw error;
      
      // Optimistically update UI
      setSites(prev => prev.map(site => 
        site.id === siteId ? { ...site, likes: site.likes + 1 } : site
      ));
    } catch (error) {
      console.error('Error liking site:', error);
    }
  };

  const handleView = async (siteId: string) => {
    // Increment view count in background
    const { data: share } = await supabase
      .from('site_shares')
      .select('views')
      .eq('site_request_id', siteId)
      .single();
      
    if (share) {
      await supabase
        .from('site_shares')
        .update({ views: share.views + 1 })
        .eq('site_request_id', siteId);
    }
    
    navigate(`/preview/${siteId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Explore Public Sites</h1>
            <p className="text-lg text-muted-foreground">
              Discover site packs created by architects and designers around the world
            </p>
          </div>

          <div className="flex items-center gap-2 justify-center">
            <Button
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              onClick={() => setSortBy('recent')}
            >
              Recent
            </Button>
            <Button
              variant={sortBy === 'views' ? 'default' : 'outline'}
              onClick={() => setSortBy('views')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Most Viewed
            </Button>
            <Button
              variant={sortBy === 'likes' ? 'default' : 'outline'}
              onClick={() => setSortBy('likes')}
            >
              <Heart className="w-4 h-4 mr-2" />
              Most Liked
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading sites...</p>
            </div>
          ) : sites.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No public sites yet. Be the first to share!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site) => (
                <Card 
                  key={site.id} 
                  className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleView(site.id)}
                >
                  <div className="relative aspect-[4/3]">
                    {site.preview_image_url ? (
                      <img
                        src={site.preview_image_url}
                        alt={site.location_name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold truncate">{site.location_name}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {site.views}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(site.id);
                            }}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Heart className="w-4 h-4" />
                            {site.likes}
                          </button>
                        </div>
                        <span>{new Date(site.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;
