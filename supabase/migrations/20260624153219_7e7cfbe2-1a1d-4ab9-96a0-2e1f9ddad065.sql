
-- 1. Recreate marketplace view with security_invoker so RLS applies to caller
DROP VIEW IF EXISTS public.supplier_profiles_marketplace;
CREATE VIEW public.supplier_profiles_marketplace
WITH (security_invoker = on) AS
SELECT id, trade_name, logo_url, status, location_district, location_municipality,
       rating_avg, rating_count, is_certified, categoria_principal, subcategorias,
       zona_atuacao, distritos_atuacao, raio_atuacao_km, tipo_fornecimento,
       service_areas, delivery_capability, sla_response_hours, min_order_value,
       prazo_medio_entrega, trabalha_credito, prazo_pagamento_padrao,
       desconto_volume, aceita_pedidos_plataforma, ano_fundacao, num_colaboradores,
       certificacoes, website, created_at
FROM public.supplier_profiles
WHERE status = 'active'::supplier_status_enum;

GRANT SELECT ON public.supplier_profiles_marketplace TO authenticated;

-- 2. Allow authenticated users to read only non-sensitive columns of active supplier profiles.
--    Column-level grants restrict which columns can be read; the RLS policy restricts which rows.
--    Owners keep full access via the existing supplier_profiles_own_select policy + base GRANT below.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.supplier_profiles'::regclass
      AND polname = 'supplier_profiles_marketplace_read'
  ) THEN
    CREATE POLICY supplier_profiles_marketplace_read
      ON public.supplier_profiles
      FOR SELECT
      TO authenticated
      USING (status = 'active'::supplier_status_enum);
  END IF;
END $$;

-- Restrict authenticated to only non-sensitive columns at the column-privilege level.
-- Owners need full-row access: they read their own row through the service_role or via
-- dedicated owner-only RPCs/queries that use service_role; here we re-grant all columns
-- to service_role and keep authenticated limited to marketplace-safe columns.
REVOKE SELECT ON public.supplier_profiles FROM authenticated;
GRANT SELECT (
  id, trade_name, logo_url, status, location_district, location_municipality,
  rating_avg, rating_count, is_certified, categoria_principal, subcategorias,
  zona_atuacao, distritos_atuacao, raio_atuacao_km, tipo_fornecimento,
  service_areas, delivery_capability, sla_response_hours, min_order_value,
  prazo_medio_entrega, trabalha_credito, prazo_pagamento_padrao,
  desconto_volume, aceita_pedidos_plataforma, ano_fundacao, num_colaboradores,
  certificacoes, website, created_at, user_id
) ON public.supplier_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supplier_profiles TO authenticated;
GRANT ALL ON public.supplier_profiles TO service_role;

-- Provide an owner-only RPC so suppliers can still read their full profile (NIF, phone, etc.).
CREATE OR REPLACE FUNCTION public.get_my_supplier_profile()
RETURNS SETOF public.supplier_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.supplier_profiles WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_supplier_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_supplier_profile() TO authenticated;

-- 3. Add SELECT policy on commercial_proposals scoped to the user's organization.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.commercial_proposals'::regclass
      AND polname = 'commercial_proposals_select_org'
  ) THEN
    CREATE POLICY commercial_proposals_select_org
      ON public.commercial_proposals
      FOR SELECT
      TO authenticated
      USING (organization_id = get_user_org_id());
  END IF;
END $$;
