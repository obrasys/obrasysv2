
-- 1) Restrict supplier_profiles column-level reads for discovery
-- Revoke broad SELECT and re-grant only non-PII columns to authenticated/anon
REVOKE SELECT ON public.supplier_profiles FROM authenticated, anon;

GRANT SELECT (
  id, user_id, legal_name, trade_name, website,
  location_district, location_municipality, localidade, pais,
  cae_principal, cae_secundario, ano_fundacao, num_colaboradores,
  certificacoes, logo_url,
  categoria_principal, subcategorias, zona_atuacao, distritos_atuacao, raio_atuacao_km,
  tipo_fornecimento, prazo_medio_entrega, min_order_value,
  trabalha_credito, desconto_volume,
  aceita_pedidos_plataforma, permite_api, atualizacao_precos, frequencia_atualizacao,
  service_areas, delivery_capability, sla_response_hours,
  rating_avg, rating_count, is_certified, status,
  aceita_termos, aceita_comunicacoes,
  created_at, updated_at
) ON public.supplier_profiles TO authenticated;

-- Owners (own row) and super-admins still need PII access:
-- Owners read PII via SECURITY DEFINER RPC public.get_my_supplier_profile (already in use by useSupplierProfile).
-- Super-admins use a separate code path; ensure service_role retains full access.
-- (service_role grant is preserved by default; not touched here.)

-- 2) organization_members: add explicit UPDATE RLS policy as defense-in-depth
-- (Trigger prevent_org_member_role_escalation_trigger already silently reverts unauthorized role changes.)
DROP POLICY IF EXISTS "Org admins can update members" ON public.organization_members;
CREATE POLICY "Org admins can update members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('admin','owner')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('admin','owner')
  )
);
