-- Create ai_logs table for design assistant chat history
CREATE TABLE public.ai_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_request_id UUID NOT NULL REFERENCES public.site_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their sites
CREATE POLICY "Users can view their own chat logs"
ON public.ai_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM site_requests
    WHERE site_requests.id = ai_logs.site_request_id
    AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

-- Users can insert logs for their sites
CREATE POLICY "Users can create chat logs for their sites"
ON public.ai_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM site_requests
    WHERE site_requests.id = ai_logs.site_request_id
    AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

-- Create credits table for Stripe integration
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  credits INTEGER NOT NULL DEFAULT 2,
  credits_used INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
ON public.user_credits
FOR UPDATE
USING (auth.uid() = user_id);

-- Create site_shares table for public gallery
CREATE TABLE public.site_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_request_id UUID NOT NULL REFERENCES public.site_requests(id) ON DELETE CASCADE UNIQUE,
  share_card_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public shares"
ON public.site_shares
FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can manage shares for their sites"
ON public.site_shares
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM site_requests
    WHERE site_requests.id = site_shares.site_request_id
    AND site_requests.user_id = auth.uid()
  )
);

-- Add email_notifications column to site_requests
ALTER TABLE public.site_requests
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_site_request ON public.ai_logs(site_request_id);
CREATE INDEX IF NOT EXISTS idx_site_shares_public ON public.site_shares(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_visual_results_site ON public.visual_results(site_request_id);