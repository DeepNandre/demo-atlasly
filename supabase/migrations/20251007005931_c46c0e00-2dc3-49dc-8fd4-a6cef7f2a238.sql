-- Create enum for site pack status
CREATE TYPE site_pack_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create site_requests table to store user's site generation requests
CREATE TABLE public.site_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  boundary_geojson JSONB NOT NULL,
  radius_meters INTEGER,
  status site_pack_status DEFAULT 'pending',
  area_sqm DOUBLE PRECISION,
  
  -- Export options
  include_buildings BOOLEAN DEFAULT true,
  include_roads BOOLEAN DEFAULT true,
  include_landuse BOOLEAN DEFAULT true,
  include_terrain BOOLEAN DEFAULT true,
  include_imagery BOOLEAN DEFAULT false,
  
  -- Generated file URLs
  file_url TEXT,
  preview_image_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.site_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own site requests
CREATE POLICY "Users can view their own site requests"
  ON public.site_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own site requests
CREATE POLICY "Users can create their own site requests"
  ON public.site_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own site requests
CREATE POLICY "Users can update their own site requests"
  ON public.site_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own site requests
CREATE POLICY "Users can delete their own site requests"
  ON public.site_requests
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_site_requests_user_id ON public.site_requests(user_id);
CREATE INDEX idx_site_requests_status ON public.site_requests(status);
CREATE INDEX idx_site_requests_created_at ON public.site_requests(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_requests_updated_at
  BEFORE UPDATE ON public.site_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_site_requests_updated_at();