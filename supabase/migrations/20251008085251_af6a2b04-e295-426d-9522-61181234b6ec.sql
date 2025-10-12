-- Create visual_results table for AI-generated renders
CREATE TABLE public.visual_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_request_id UUID NOT NULL REFERENCES public.site_requests(id) ON DELETE CASCADE,
  input_url TEXT NOT NULL,
  output_url TEXT NOT NULL,
  style TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.visual_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own visualizations
CREATE POLICY "Users can view their own visualizations"
ON public.visual_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.site_requests
    WHERE site_requests.id = visual_results.site_request_id
    AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

-- Users can create visualizations for their own site requests
CREATE POLICY "Users can create visualizations for their sites"
ON public.visual_results
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.site_requests
    WHERE site_requests.id = visual_results.site_request_id
    AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

-- Users can delete their own visualizations
CREATE POLICY "Users can delete their own visualizations"
ON public.visual_results
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.site_requests
    WHERE site_requests.id = visual_results.site_request_id
    AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

-- Create storage bucket for visualizations
INSERT INTO storage.buckets (id, name, public)
VALUES ('visuals', 'visuals', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for visuals bucket
CREATE POLICY "Users can upload their own visualizations"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'visuals' AND
  EXISTS (
    SELECT 1 FROM public.site_requests
    WHERE site_requests.id::text = (storage.foldername(name))[1]
    AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

CREATE POLICY "Anyone can view public visualizations"
ON storage.objects
FOR SELECT
USING (bucket_id = 'visuals');