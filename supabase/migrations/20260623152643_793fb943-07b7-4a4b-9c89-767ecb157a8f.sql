
-- ============================================================
-- 1) supplier_profiles: remove broad marketplace read of PII
-- ============================================================
-- Drop the overly permissive policy that exposed NIF/phones/email/address to
-- every authenticated user.
DROP POLICY IF EXISTS supplier_profiles_active_marketplace_read ON public.supplier_profiles;

-- Public-safe marketplace projection. Runs as view owner (definer-style)
-- to bypass RLS while exposing only non-sensitive columns. Sensitive columns
-- (nif, phone, telemovel, telefone_fixo, email_comercial, responsavel_nome,
-- morada_completa, codigo_postal, payment_terms, cae*) are intentionally
-- excluded.
CREATE OR REPLACE VIEW public.supplier_profiles_marketplace AS
SELECT
  id,
  trade_name,
  logo_url,
  status,
  location_district,
  location_municipality,
  rating_avg,
  rating_count,
  is_certified,
  categoria_principal,
  subcategorias,
  zona_atuacao,
  distritos_atuacao,
  raio_atuacao_km,
  tipo_fornecimento,
  service_areas,
  delivery_capability,
  sla_response_hours,
  min_order_value,
  prazo_medio_entrega,
  trabalha_credito,
  prazo_pagamento_padrao,
  desconto_volume,
  aceita_pedidos_plataforma,
  ano_fundacao,
  num_colaboradores,
  certificacoes,
  website,
  created_at
FROM public.supplier_profiles
WHERE status = 'active';

REVOKE ALL ON public.supplier_profiles_marketplace FROM PUBLIC, anon;
GRANT SELECT ON public.supplier_profiles_marketplace TO authenticated;

-- After this migration the base table is reachable only via the existing
-- owner-scoped policies (supplier_profiles_own_select / own_insert /
-- own_update) and the super-admin update policy. Marketplace consumers must
-- query supplier_profiles_marketplace instead.

-- ============================================================
-- 2) commercial_proposals: add missing DELETE policy
-- ============================================================
CREATE POLICY commercial_proposals_delete_org
ON public.commercial_proposals
FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND (
    created_by = auth.uid()
    OR public.is_org_admin()
  )
);

-- ============================================================
-- 3) supplier_reviews: allow the reviewed supplier to read their reviews
-- ============================================================
CREATE POLICY reviews_select_for_reviewed_supplier
ON public.supplier_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.supplier_profiles sp
    WHERE sp.id = supplier_reviews.supplier_id
      AND sp.user_id = auth.uid()
  )
);

-- ============================================================
-- 4) budget-documents storage: allow org admins to update/delete files
-- ============================================================
CREATE POLICY "Org admins can update budget documents storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'budget-documents'
  AND ((storage.foldername(name))[1])::uuid = ANY (public.get_org_member_ids())
  AND public.is_org_admin()
)
WITH CHECK (
  bucket_id = 'budget-documents'
  AND ((storage.foldername(name))[1])::uuid = ANY (public.get_org_member_ids())
  AND public.is_org_admin()
);

CREATE POLICY "Org admins can delete budget documents storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'budget-documents'
  AND ((storage.foldername(name))[1])::uuid = ANY (public.get_org_member_ids())
  AND public.is_org_admin()
);
