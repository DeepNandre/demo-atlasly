import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionFeatures {
  max_site_packs_per_month: number;
  max_radius_meters: number;
  ai_chat_enabled: boolean;
  export_formats: string[];
  api_calls_per_month: number;
  team_members: number;
  portfolio_enabled: boolean;
}

interface Subscription {
  id: string;
  tier: 'free' | 'pro' | 'teams' | 'enterprise';
  features_enabled: SubscriptionFeatures;
  monthly_quota_used: number;
  billing_period_start: string | null;
  billing_period_end: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [sitesThisMonth, setSitesThisMonth] = useState(0);

  const fetchSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // Cast the data with proper types
      const subscriptionData: Subscription = {
        ...data,
        features_enabled: data.features_enabled as unknown as SubscriptionFeatures,
      };
      
      setSubscription(subscriptionData);

      // Count sites created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('site_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      setSitesThisMonth(count || 0);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const canCreateSite = () => {
    if (!subscription) return false;
    const limit = subscription.features_enabled.max_site_packs_per_month;
    return sitesThisMonth < limit;
  };

  const getRemainingQuota = () => {
    if (!subscription) return 0;
    const limit = subscription.features_enabled.max_site_packs_per_month;
    return Math.max(0, limit - sitesThisMonth);
  };

  const getTierDisplayName = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'text-muted-foreground';
      case 'pro': return 'text-blue-500';
      case 'teams': return 'text-purple-500';
      case 'enterprise': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  };

  return {
    subscription,
    loading,
    sitesThisMonth,
    canCreateSite,
    getRemainingQuota,
    getTierDisplayName,
    getTierColor,
    refetch: fetchSubscription,
  };
};
