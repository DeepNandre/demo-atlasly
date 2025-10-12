-- Add progress tracking and error handling columns to site_requests
ALTER TABLE public.site_requests 
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message text;

-- Create storage bucket for site packs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-packs', 'site-packs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for site-packs bucket
CREATE POLICY "Users can view their own site packs"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-packs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role can manage all site packs"
ON storage.objects FOR ALL
USING (bucket_id = 'site-packs');