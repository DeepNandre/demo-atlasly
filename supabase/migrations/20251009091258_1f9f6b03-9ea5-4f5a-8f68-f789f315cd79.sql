-- Add elevation_summary column to site_requests
ALTER TABLE public.site_requests 
ADD COLUMN elevation_summary jsonb;

COMMENT ON COLUMN public.site_requests.elevation_summary IS 'Cached elevation analysis: min_m, max_m, mean_m, slope_avg_deg, aspect_histogram';