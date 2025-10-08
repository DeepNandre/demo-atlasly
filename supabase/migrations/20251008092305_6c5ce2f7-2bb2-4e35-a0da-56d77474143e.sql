-- Create feedback table for user feedback
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_request_id UUID REFERENCES public.site_requests(id) ON DELETE CASCADE,
  user_id UUID,
  message TEXT NOT NULL,
  email TEXT,
  page TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'archived')),
  tags TEXT[],
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_logs table for telemetry
CREATE TABLE public.job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_request_id UUID NOT NULL REFERENCES public.site_requests(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;

-- Feedback policies: users can create and view their own
CREATE POLICY "Users can create feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own feedback"
  ON public.feedback
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Job logs policies: only service role can write, users can view their own
CREATE POLICY "Service role can manage job logs"
  ON public.job_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view logs for their requests"
  ON public.job_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_requests
      WHERE site_requests.id = job_logs.site_request_id
      AND (site_requests.user_id = auth.uid() OR (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
    )
  );

-- Create indexes for performance
CREATE INDEX idx_feedback_site_request ON public.feedback(site_request_id);
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_created ON public.feedback(created_at DESC);
CREATE INDEX idx_job_logs_site_request ON public.job_logs(site_request_id);
CREATE INDEX idx_job_logs_stage ON public.job_logs(stage);
CREATE INDEX idx_job_logs_created ON public.job_logs(created_at DESC);

-- Trigger for feedback updated_at
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_site_requests_updated_at();