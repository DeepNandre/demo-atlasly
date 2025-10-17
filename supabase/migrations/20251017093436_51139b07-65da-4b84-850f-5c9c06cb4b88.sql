-- Phase 1: Enhanced AI Backend Database Schema

-- 1. Environmental data cache table
CREATE TABLE IF NOT EXISTS public.environmental_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_request_id UUID NOT NULL REFERENCES public.site_requests(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('wind', 'solar', 'temperature', 'climate')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Analysis tasks table for multi-step workflow tracking
CREATE TABLE IF NOT EXISTS public.analysis_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_request_id UUID NOT NULL REFERENCES public.site_requests(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.analysis_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'complete', 'error')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  layer_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. User drawings table for spatial features
CREATE TABLE IF NOT EXISTS public.user_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_request_id UUID NOT NULL REFERENCES public.site_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Drawing',
  geometry JSONB NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  style JSONB DEFAULT '{"color": "#3b82f6", "fillOpacity": 0.3}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_environmental_data_site_type ON public.environmental_data(site_request_id, data_type);
CREATE INDEX IF NOT EXISTS idx_environmental_data_expires ON public.environmental_data(expires_at);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_site ON public.analysis_tasks(site_request_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_parent ON public.analysis_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_status ON public.analysis_tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_drawings_site ON public.user_drawings(site_request_id);
CREATE INDEX IF NOT EXISTS idx_user_drawings_user ON public.user_drawings(user_id);

-- Enable Row Level Security
ALTER TABLE public.environmental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drawings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for environmental_data
CREATE POLICY "Users can view environmental data for their sites"
  ON public.environmental_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.site_requests
      WHERE site_requests.id = environmental_data.site_request_id
      AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
    )
  );

CREATE POLICY "Service role can manage environmental data"
  ON public.environmental_data FOR ALL
  USING (true);

-- RLS Policies for analysis_tasks
CREATE POLICY "Users can view their own analysis tasks"
  ON public.analysis_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.site_requests
      WHERE site_requests.id = analysis_tasks.site_request_id
      AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
    )
  );

CREATE POLICY "Users can create analysis tasks for their sites"
  ON public.analysis_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_requests
      WHERE site_requests.id = analysis_tasks.site_request_id
      AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
    )
  );

CREATE POLICY "Service role can manage analysis tasks"
  ON public.analysis_tasks FOR ALL
  USING (true);

-- RLS Policies for user_drawings
CREATE POLICY "Users can view their own drawings"
  ON public.user_drawings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own drawings"
  ON public.user_drawings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own drawings"
  ON public.user_drawings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own drawings"
  ON public.user_drawings FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analysis_tasks_updated_at
  BEFORE UPDATE ON public.analysis_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_drawings_updated_at
  BEFORE UPDATE ON public.user_drawings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for analysis_tasks (for progress tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_tasks;