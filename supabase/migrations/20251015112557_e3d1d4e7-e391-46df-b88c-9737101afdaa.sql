-- Function to promote user to admin (only works if no admins exist yet)
CREATE OR REPLACE FUNCTION become_first_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Check if any admins exist
  SELECT COUNT(*) INTO admin_count
  FROM user_roles
  WHERE role = 'admin';
  
  -- If no admins exist, make the current user an admin
  IF admin_count = 0 THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Function for existing admins to promote other users
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  
  -- Promote target user to admin
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;