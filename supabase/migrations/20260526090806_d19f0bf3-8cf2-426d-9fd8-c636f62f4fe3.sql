
-- ============================================================
-- 1. Realtime: scope channel topics by organization
-- ============================================================
DROP POLICY IF EXISTS "authenticated users can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated users can broadcast realtime" ON realtime.messages;

CREATE POLICY "Org members can read realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    public.get_user_org_id() IS NOT NULL
    AND (realtime.topic())::text LIKE ('org:' || public.get_user_org_id()::text || ':%')
  );

CREATE POLICY "Org members can broadcast realtime messages"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_org_id() IS NOT NULL
    AND (realtime.topic())::text LIKE ('org:' || public.get_user_org_id()::text || ':%')
  );

-- ============================================================
-- 2. Supplier profiles: revoke sensitive PII columns
-- ============================================================
REVOKE SELECT (
  nif,
  phone,
  telemovel,
  telefone_fixo,
  email_comercial,
  morada_completa,
  codigo_postal,
  responsavel_nome,
  payment_terms
) ON public.supplier_profiles FROM anon, authenticated;

-- ============================================================
-- 3. Super Admin RPC to list all supplier profiles (incl. PII)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_all_supplier_profiles()
RETURNS SETOF public.supplier_profiles
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas Super Admins podem aceder a esta lista';
  END IF;
  RETURN QUERY SELECT * FROM public.supplier_profiles ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_supplier_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_all_supplier_profiles() TO authenticated;
