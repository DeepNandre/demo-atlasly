import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasTier, setHasTier] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase.rpc('is_admin');
        
        if (roleError) {
          console.error('Error checking admin status:', roleError);
          setIsAdmin(false);
        } else {
          setIsAdmin(roleData || false);
        }

        // Check user's subscription tier
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('tier')
          .single();

        if (subError) {
          console.error('Error checking subscription tier:', subError);
          setHasTier(false);
          setTier(null);
        } else {
          const userTier = subData?.tier;
          setTier(userTier);
          // Admin features only for teams or enterprise tier
          setHasTier(userTier === 'teams' || userTier === 'enterprise');
        }
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
        setHasTier(false);
        setTier(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  // User must have BOTH admin role AND teams/enterprise tier
  const canAccessAdmin = isAdmin && hasTier;

  return { isAdmin, hasTier, canAccessAdmin, tier, loading };
};
