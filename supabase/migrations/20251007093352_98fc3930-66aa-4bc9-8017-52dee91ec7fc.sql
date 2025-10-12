-- Add client_id column for guest users
ALTER TABLE public.site_requests 
ADD COLUMN IF NOT EXISTS client_id text;

-- Create index for faster client_id lookups
CREATE INDEX IF NOT EXISTS idx_site_requests_client_id ON public.site_requests(client_id);

-- Update RLS policies to allow guest access via client_id
DROP POLICY IF EXISTS "Users can view their own site requests" ON public.site_requests;
DROP POLICY IF EXISTS "Users can create their own site requests" ON public.site_requests;
DROP POLICY IF EXISTS "Users can update their own site requests" ON public.site_requests;
DROP POLICY IF EXISTS "Users can delete their own site requests" ON public.site_requests;

-- New policies supporting both auth and guest access
CREATE POLICY "Users can view their own or client requests"
ON public.site_requests FOR SELECT
USING (
  auth.uid() = user_id 
  OR (user_id IS NULL AND client_id IS NOT NULL)
);

CREATE POLICY "Users can create their own or client requests"
ON public.site_requests FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR (user_id IS NULL AND client_id IS NOT NULL)
);

CREATE POLICY "Users can update their own or client requests"
ON public.site_requests FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (user_id IS NULL AND client_id IS NOT NULL)
);

CREATE POLICY "Users can delete their own or client requests"
ON public.site_requests FOR DELETE
USING (
  auth.uid() = user_id 
  OR (user_id IS NULL AND client_id IS NOT NULL)
);