-- Add new columns for extended site packing features
ALTER TABLE public.site_requests
ADD COLUMN IF NOT EXISTS climate_summary jsonb,
ADD COLUMN IF NOT EXISTS exports_dwg boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exports_skp boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exports_pdf boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.site_requests.climate_summary IS 'Climate data summary including temperature, solar, wind, and rainfall data';
COMMENT ON COLUMN public.site_requests.exports_dwg IS 'Include DWG (AutoCAD) export format';
COMMENT ON COLUMN public.site_requests.exports_skp IS 'Include SKP (SketchUp) export format';
COMMENT ON COLUMN public.site_requests.exports_pdf IS 'Include PDF 2D plan export';