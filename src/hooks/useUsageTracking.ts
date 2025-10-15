import { supabase } from '@/integrations/supabase/client';

type FeatureName = 
  | 'site_pack_generation'
  | 'three_d_preview'
  | 'ai_chat'
  | 'visualization_generation'
  | 'export_dxf'
  | 'export_glb'
  | 'export_pdf'
  | 'solar_analysis'
  | 'climate_data'
  | 'elevation_analysis';

export const useUsageTracking = () => {
  const trackFeatureUsage = async (
    feature: FeatureName,
    siteRequestId?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user logged in, skipping analytics');
        return;
      }

      const { error } = await supabase.from('usage_analytics').insert({
        user_id: user.id,
        site_request_id: siteRequestId,
        feature,
        metadata: metadata || {},
      });

      if (error) {
        console.error('Error tracking feature usage:', error);
      }
    } catch (error) {
      console.error('Error in trackFeatureUsage:', error);
    }
  };

  return { trackFeatureUsage };
};
