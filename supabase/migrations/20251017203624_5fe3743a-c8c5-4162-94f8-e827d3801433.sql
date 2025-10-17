-- Create population cache table for storing Kontur population data
CREATE TABLE IF NOT EXISTS public.population_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bbox_key TEXT NOT NULL UNIQUE,
  geojson JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  min_lat DOUBLE PRECISION NOT NULL,
  max_lat DOUBLE PRECISION NOT NULL,
  min_lng DOUBLE PRECISION NOT NULL,
  max_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for bbox queries
CREATE INDEX IF NOT EXISTS idx_population_cache_bbox ON public.population_cache (min_lat, max_lat, min_lng, max_lng);
CREATE INDEX IF NOT EXISTS idx_population_cache_expires ON public.population_cache (expires_at);

-- Enable RLS
ALTER TABLE public.population_cache ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read population data (it's public information)
CREATE POLICY "Anyone can read population cache"
  ON public.population_cache
  FOR SELECT
  USING (true);

-- Only service role can insert/update cache
CREATE POLICY "Service role can manage population cache"
  ON public.population_cache
  FOR ALL
  USING (true);

-- Create function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_population_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.population_cache
  WHERE expires_at < now();
END;
$$;