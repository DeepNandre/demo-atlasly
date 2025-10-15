-- Phase 1: Foundation for API Platform
-- Usage Analytics & Tiered Pricing

-- Create enum for subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'teams', 'enterprise');

-- Create enum for feature names for analytics
CREATE TYPE feature_name AS ENUM (
  'site_pack_generation',
  'three_d_preview',
  'ai_chat',
  'visualization_generation',
  'export_dxf',
  'export_glb',
  'export_pdf',
  'solar_analysis',
  'climate_data',
  'elevation_analysis'
);

-- Usage analytics table
CREATE TABLE public.usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_request_id UUID REFERENCES public.site_requests(id) ON DELETE CASCADE,
  feature feature_name NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics
CREATE POLICY "Users can view their own analytics"
ON public.usage_analytics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own analytics
CREATE POLICY "Users can create their own analytics"
ON public.usage_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role can manage all analytics
CREATE POLICY "Service role can manage analytics"
ON public.usage_analytics
FOR ALL
TO service_role
USING (true);

-- User subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  features_enabled JSONB DEFAULT '{
    "max_site_packs_per_month": 2,
    "max_radius_meters": 500,
    "ai_chat_enabled": true,
    "export_formats": ["pdf"],
    "api_calls_per_month": 0,
    "team_members": 1,
    "portfolio_enabled": false
  }'::jsonb,
  monthly_quota_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions
FOR ALL
TO service_role
USING (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_site_requests_updated_at();

-- API keys table for future API platform
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own API keys
CREATE POLICY "Users can manage their own API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- API requests logging table
CREATE TABLE public.api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own API requests
CREATE POLICY "Users can view their own API requests"
ON public.api_requests
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.api_keys
  WHERE public.api_keys.id = api_requests.api_key_id
  AND public.api_keys.user_id = auth.uid()
));

-- Function to automatically create free subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, tier, features_enabled)
  VALUES (
    NEW.id,
    'free',
    '{
      "max_site_packs_per_month": 2,
      "max_radius_meters": 500,
      "ai_chat_enabled": true,
      "export_formats": ["pdf"],
      "api_calls_per_month": 0,
      "team_members": 1,
      "portfolio_enabled": false
    }'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Trigger to create subscription on user signup
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_subscription();

-- Create index for better query performance
CREATE INDEX idx_usage_analytics_user_id ON public.usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_created_at ON public.usage_analytics(created_at);
CREATE INDEX idx_api_requests_created_at ON public.api_requests(created_at);
CREATE INDEX idx_user_subscriptions_tier ON public.user_subscriptions(tier);