
DROP FUNCTION IF EXISTS public.get_public_supplier_profiles();

CREATE OR REPLACE FUNCTION public.get_public_supplier_profiles()
RETURNS TABLE (
  id uuid,
  legal_name text,
  trade_name text,
  logo_url text,
  status supplier_status_enum,
  is_certified boolean,
  rating_avg numeric,
  rating_count integer,
  sla_response_hours integer,
  min_order_value numeric,
  payment_terms text,
  delivery_capability text,
  service_areas text,
  location_district text,
  location_municipality text,
  nif text,
  categoria_principal text,
  subcategorias text[],
  certificacoes text[],
  zona_atuacao text,
  distritos_atuacao text[],
  raio_atuacao_km integer,
  tipo_fornecimento text[],
  prazo_medio_entrega text,
  trabalha_credito boolean,
  prazo_pagamento_padrao text,
  desconto_volume boolean,
  ano_fundacao integer,
  num_colaboradores text,
  cae_principal text,
  cae_secundario text,
  website text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id, sp.legal_name, sp.trade_name, sp.logo_url, sp.status, sp.is_certified,
    sp.rating_avg, sp.rating_count, sp.sla_response_hours, sp.min_order_value,
    sp.payment_terms, sp.delivery_capability, sp.service_areas,
    sp.location_district, sp.location_municipality, sp.nif,
    sp.categoria_principal, sp.subcategorias, sp.certificacoes,
    sp.zona_atuacao, sp.distritos_atuacao, sp.raio_atuacao_km,
    sp.tipo_fornecimento, sp.prazo_medio_entrega, sp.trabalha_credito,
    sp.prazo_pagamento_padrao, sp.desconto_volume, sp.ano_fundacao,
    sp.num_colaboradores, sp.cae_principal, sp.cae_secundario, sp.website,
    sp.created_at, sp.updated_at
  FROM public.supplier_profiles sp
  WHERE sp.status = 'active'
    AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_supplier_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_supplier_profiles() TO authenticated;
