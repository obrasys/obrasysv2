-- 1. Fix material_price_raw SELECT policy: replace profiles.role='admin' with is_super_admin()
DROP POLICY IF EXISTS "Utilizadores veem seus próprios preços" ON public.material_price_raw;
CREATE POLICY "Utilizadores veem seus próprios preços"
ON public.material_price_raw
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_super_admin()
);

-- 2. Prevent privilege escalation: block users from self-updating profiles.role
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Não autorizado: apenas Super Admins podem alterar o campo role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_self_update_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_role_self_update_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_self_update();