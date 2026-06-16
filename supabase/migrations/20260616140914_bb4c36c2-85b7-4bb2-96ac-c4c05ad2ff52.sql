
-- =========================================================
-- FASE 1: Multi-tenant suppliers base
-- =========================================================

-- 1. Helper: get current user's primary organization
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org_id
  )
$$;

-- 2. Add organization_id to fornecedores
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS pessoa_contacto text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS prazo_medio_entrega_dias integer,
  ADD COLUMN IF NOT EXISTS prazo_medio_pagamento_dias integer,
  ADD COLUMN IF NOT EXISTS condicoes_comerciais text,
  ADD COLUMN IF NOT EXISTS supplier_profile_id uuid REFERENCES public.supplier_profiles(id) ON DELETE SET NULL;

-- Backfill organization_id from organization_members
UPDATE public.fornecedores f
SET organization_id = om.organization_id,
    created_by = COALESCE(f.created_by, f.user_id)
FROM public.organization_members om
WHERE om.user_id = f.user_id
  AND f.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_fornecedores_org ON public.fornecedores(organization_id);

-- 3. Add organization_id to supplier_invites
ALTER TABLE public.supplier_invites
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nome_fornecedor text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS mensagem text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

UPDATE public.supplier_invites si
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE om.user_id = si.invited_by_admin_user_id
  AND si.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_invites_org ON public.supplier_invites(organization_id);

-- 4. Add organization_id and tenant linkage to quote_requests / quote_responses
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS terms text;

UPDATE public.quote_requests qr
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE om.user_id = qr.builder_user_id
  AND qr.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_org ON public.quote_requests(organization_id);

ALTER TABLE public.quote_responses
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS terms text;

UPDATE public.quote_responses qres
SET organization_id = qr.organization_id
FROM public.quote_requests qr
WHERE qr.id = qres.quote_request_id
  AND qres.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_quote_responses_org ON public.quote_responses(organization_id);

-- 5. New table: tenant_supplier_pricebooks
CREATE TABLE IF NOT EXISTS public.tenant_supplier_pricebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  name text NOT NULL,
  file_path text,
  file_name text,
  file_type text,
  file_size_bytes integer,
  categoria text,
  valid_from date,
  valid_to date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_supplier_pricebooks TO authenticated;
GRANT ALL ON public.tenant_supplier_pricebooks TO service_role;

ALTER TABLE public.tenant_supplier_pricebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_pricebooks_org_select" ON public.tenant_supplier_pricebooks
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "tenant_pricebooks_org_insert" ON public.tenant_supplier_pricebooks
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND uploaded_by = auth.uid());
CREATE POLICY "tenant_pricebooks_org_update" ON public.tenant_supplier_pricebooks
  FOR UPDATE TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "tenant_pricebooks_org_delete" ON public.tenant_supplier_pricebooks
  FOR DELETE TO authenticated USING (public.is_org_member(organization_id));

CREATE INDEX idx_tspb_org ON public.tenant_supplier_pricebooks(organization_id);
CREATE INDEX idx_tspb_fornecedor ON public.tenant_supplier_pricebooks(fornecedor_id);

-- 6. New table: tenant_supplier_pricebook_items
CREATE TABLE IF NOT EXISTS public.tenant_supplier_pricebook_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricebook_id uuid NOT NULL REFERENCES public.tenant_supplier_pricebooks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  codigo_artigo text,
  descricao text NOT NULL,
  unidade text,
  preco_unitario numeric(14,4) NOT NULL DEFAULT 0,
  iva numeric(5,2) DEFAULT 23,
  preco_com_iva numeric(14,4) GENERATED ALWAYS AS (
    ROUND(preco_unitario * (1 + COALESCE(iva,0)/100), 4)
  ) STORED,
  categoria text,
  marca text,
  referencia text,
  observacoes text,
  validade date,
  lead_time_days integer,
  origem_importacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_supplier_pricebook_items TO authenticated;
GRANT ALL ON public.tenant_supplier_pricebook_items TO service_role;

ALTER TABLE public.tenant_supplier_pricebook_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_pricebook_items_org_select" ON public.tenant_supplier_pricebook_items
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "tenant_pricebook_items_org_insert" ON public.tenant_supplier_pricebook_items
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "tenant_pricebook_items_org_update" ON public.tenant_supplier_pricebook_items
  FOR UPDATE TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "tenant_pricebook_items_org_delete" ON public.tenant_supplier_pricebook_items
  FOR DELETE TO authenticated USING (public.is_org_member(organization_id));

CREATE INDEX idx_tspbi_pricebook ON public.tenant_supplier_pricebook_items(pricebook_id);
CREATE INDEX idx_tspbi_org ON public.tenant_supplier_pricebook_items(organization_id);
CREATE INDEX idx_tspbi_forn ON public.tenant_supplier_pricebook_items(fornecedor_id);
CREATE INDEX idx_tspbi_descricao_trgm ON public.tenant_supplier_pricebook_items USING gin (descricao gin_trgm_ops);

-- 7. New table: tenant_supplier_links (connects supplier_profiles to organizations)
CREATE TABLE IF NOT EXISTS public.tenant_supplier_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_profile_id uuid REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  invite_id uuid REFERENCES public.supplier_invites(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, supplier_profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_supplier_links TO authenticated;
GRANT ALL ON public.tenant_supplier_links TO service_role;

ALTER TABLE public.tenant_supplier_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tsl_org_all" ON public.tenant_supplier_links
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- Supplier can read their own links (to know which orgs they belong to)
CREATE POLICY "tsl_supplier_self_select" ON public.tenant_supplier_links
  FOR SELECT TO authenticated
  USING (supplier_profile_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_tsl_org ON public.tenant_supplier_links(organization_id);
CREATE INDEX idx_tsl_supplier ON public.tenant_supplier_links(supplier_profile_id);

-- 8. SECURITY DEFINER helper for supplier portal: can this supplier serve this org?
CREATE OR REPLACE FUNCTION public.supplier_can_access_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_supplier_links tsl
    JOIN public.supplier_profiles sp ON sp.id = tsl.supplier_profile_id
    WHERE sp.user_id = auth.uid()
      AND tsl.organization_id = _org_id
      AND tsl.status = 'active'
  )
$$;

-- 9. Updated_at triggers
CREATE TRIGGER trg_tspb_updated BEFORE UPDATE ON public.tenant_supplier_pricebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tspbi_updated BEFORE UPDATE ON public.tenant_supplier_pricebook_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tsl_updated BEFORE UPDATE ON public.tenant_supplier_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Refresh policies on supplier_invites to be org-scoped
DROP POLICY IF EXISTS "supplier_invites_admin_all" ON public.supplier_invites;
DROP POLICY IF EXISTS "supplier_invites_inviter_all" ON public.supplier_invites;
DROP POLICY IF EXISTS "supplier_invites_org_all" ON public.supplier_invites;

CREATE POLICY "supplier_invites_org_all" ON public.supplier_invites
  FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_member(organization_id) AND invited_by_admin_user_id = auth.uid());

-- 11. Storage policies for supplier-pricelists bucket (path: {organization_id}/...)
DROP POLICY IF EXISTS "supplier_pricelists_org_select" ON storage.objects;
DROP POLICY IF EXISTS "supplier_pricelists_org_insert" ON storage.objects;
DROP POLICY IF EXISTS "supplier_pricelists_org_update" ON storage.objects;
DROP POLICY IF EXISTS "supplier_pricelists_org_delete" ON storage.objects;

CREATE POLICY "supplier_pricelists_org_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-pricelists'
         AND public.is_org_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "supplier_pricelists_org_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-pricelists'
              AND public.is_org_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "supplier_pricelists_org_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'supplier-pricelists'
         AND public.is_org_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "supplier_pricelists_org_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'supplier-pricelists'
         AND public.is_org_member((storage.foldername(name))[1]::uuid));
