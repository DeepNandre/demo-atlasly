-- Add new columns for ZIP metadata and artifact tracking
ALTER TABLE public.site_requests 
ADD COLUMN IF NOT EXISTS zip_size_bytes bigint,
ADD COLUMN IF NOT EXISTS zip_sha256 text,
ADD COLUMN IF NOT EXISTS file_count integer,
ADD COLUMN IF NOT EXISTS artifact_key text;

-- Add index on artifact_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_requests_artifact_key ON public.site_requests(artifact_key);

-- Add comment for documentation
COMMENT ON COLUMN public.site_requests.zip_size_bytes IS 'Size of the generated ZIP file in bytes';
COMMENT ON COLUMN public.site_requests.zip_sha256 IS 'SHA256 checksum of the ZIP file for integrity verification';
COMMENT ON COLUMN public.site_requests.file_count IS 'Number of files included in the ZIP package';
COMMENT ON COLUMN public.site_requests.artifact_key IS 'Storage path key for the uploaded artifact (e.g., site-packs/<id>/<id>_site_pack.zip)';