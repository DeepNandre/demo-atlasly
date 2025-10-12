-- Add export format columns to site_requests
ALTER TABLE public.site_requests 
ADD COLUMN IF NOT EXISTS include_dxf boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS include_glb boolean DEFAULT false;