
-- Remove the broad row-level read policy that we just added
DROP POLICY IF EXISTS supplier_profiles_public_view_access ON public.supplier_profiles;

-- Recreate the public discovery view as SECURITY DEFINER (security_invoker=off, default)
-- so it can read active rows on behalf of authenticated users without exposing
-- sensitive columns or requiring a permissive RLS policy on the base table.
DROP VIEW IF EXISTS public.supplier_profiles_public CASCADE;
CREATE VIEW public.supplier_profiles_public AS
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

REVOKE ALL ON public.supplier_profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.supplier_profiles_public TO authenticated;
