
-- 1. Re-allow row-level SELECT on active supplier rows so embedded joins keep working
CREATE POLICY supplier_profiles_active_discovery
  ON public.supplier_profiles
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- 2. Revoke column-level SELECT on private contact fields from authenticated.
--    These fields contain PII and should not be readable by other authenticated users.
REVOKE SELECT (
  email_comercial,
  telemovel,
  telefone_fixo,
  morada_completa,
  codigo_postal,
  responsavel_nome,
  phone
) ON public.supplier_profiles FROM authenticated;

-- 3. Provide owners with a SECURITY DEFINER function to read their own full profile,
--    including the now-restricted contact columns.
CREATE OR REPLACE FUNCTION public.get_my_supplier_profile()
RETURNS SETOF public.supplier_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.supplier_profiles WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_supplier_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_supplier_profile() TO authenticated;
