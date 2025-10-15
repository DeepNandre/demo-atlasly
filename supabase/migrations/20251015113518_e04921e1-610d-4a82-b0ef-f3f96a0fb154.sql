-- Update the trigger function to read tier from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  selected_tier subscription_tier;
  tier_features jsonb;
BEGIN
  -- Read tier from raw_user_meta_data, default to 'free' if not set
  selected_tier := COALESCE(
    (NEW.raw_user_meta_data->>'subscription_tier')::subscription_tier,
    'free'::subscription_tier
  );
  
  -- Set features based on selected tier
  CASE selected_tier
    WHEN 'free' THEN
      tier_features := '{
        "max_site_packs_per_month": 2,
        "max_radius_meters": 500,
        "ai_chat_enabled": true,
        "export_formats": ["pdf"],
        "api_calls_per_month": 0,
        "team_members": 1,
        "portfolio_enabled": false
      }'::jsonb;
    WHEN 'pro' THEN
      tier_features := '{
        "max_site_packs_per_month": 20,
        "max_radius_meters": 2000,
        "ai_chat_enabled": true,
        "export_formats": ["pdf", "dxf", "dwg", "glb", "skp"],
        "api_calls_per_month": 0,
        "team_members": 1,
        "portfolio_enabled": false
      }'::jsonb;
    WHEN 'teams' THEN
      tier_features := '{
        "max_site_packs_per_month": -1,
        "max_radius_meters": -1,
        "ai_chat_enabled": true,
        "export_formats": ["pdf", "dxf", "dwg", "glb", "skp"],
        "api_calls_per_month": 10000,
        "team_members": 5,
        "portfolio_enabled": true
      }'::jsonb;
    WHEN 'enterprise' THEN
      tier_features := '{
        "max_site_packs_per_month": -1,
        "max_radius_meters": -1,
        "ai_chat_enabled": true,
        "export_formats": ["pdf", "dxf", "dwg", "glb", "skp"],
        "api_calls_per_month": -1,
        "team_members": -1,
        "portfolio_enabled": true
      }'::jsonb;
    ELSE
      tier_features := '{
        "max_site_packs_per_month": 2,
        "max_radius_meters": 500,
        "ai_chat_enabled": true,
        "export_formats": ["pdf"],
        "api_calls_per_month": 0,
        "team_members": 1,
        "portfolio_enabled": false
      }'::jsonb;
  END CASE;
  
  -- Insert subscription record with selected tier
  INSERT INTO public.user_subscriptions (user_id, tier, features_enabled)
  VALUES (NEW.id, selected_tier, tier_features);
  
  RETURN NEW;
END;
$function$;