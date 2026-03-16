
-- Drop the existing permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with column restrictions excluding 'role'
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a security definer function to prevent role column updates by non-admins
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If role is being changed, only allow it via service role (not regular users)
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if the current user is a super admin
    IF NOT public.is_super_admin() THEN
      NEW.role := OLD.role; -- Silently revert the role change
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS prevent_role_self_update_trigger ON public.profiles;
CREATE TRIGGER prevent_role_self_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_update();
