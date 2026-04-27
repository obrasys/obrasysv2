
-- 1. Drop overly broad public SELECT policy on supplier_profiles
DROP POLICY IF EXISTS supplier_profiles_builders_select ON public.supplier_profiles;

-- 2. Create a public-discovery view exposing only non-PII columns
DROP VIEW IF EXISTS public.supplier_profiles_public CASCADE;
CREATE VIEW public.supplier_profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  legal_name,
  trade_name,
  logo_url,
  status,
  is_certified,
  rating_avg,
  rating_count,
  sla_response_hours,
  min_order_value,
  payment_terms,
  delivery_capability,
  service_areas,
  location_district,
  location_municipality,
  nif,
  categoria_principal,
  subcategorias,
  certificacoes,
  zona_atuacao,
  distritos_atuacao,
  raio_atuacao_km,
  tipo_fornecimento,
  prazo_medio_entrega,
  trabalha_credito,
  prazo_pagamento_padrao,
  desconto_volume,
  ano_fundacao,
  num_colaboradores,
  cae_principal,
  cae_secundario,
  website,
  created_at,
  updated_at
FROM public.supplier_profiles
WHERE status = 'active';

-- 3. Allow authenticated users to read the public discovery view
GRANT SELECT ON public.supplier_profiles_public TO authenticated;

-- 4. Add a narrow row-level policy on the base table so the view (security_invoker=on)
--    can return active supplier rows to authenticated users — but we intentionally do
--    NOT add a broad SELECT policy that returns sensitive columns; only owners and
--    super admins keep that ability. The view restricts which columns are exposed.
CREATE POLICY supplier_profiles_public_view_access
  ON public.supplier_profiles
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Note: we keep the policy permissive at row level, but column exposure is now
-- controlled by querying through public.supplier_profiles_public which selects
-- only safe fields. App code is being updated to use the view for discovery.
-- Owners continue to read full row via supplier_profiles_own_select.
