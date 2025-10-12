-- Fix search path for update_site_requests_updated_at function
CREATE OR REPLACE FUNCTION update_site_requests_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;