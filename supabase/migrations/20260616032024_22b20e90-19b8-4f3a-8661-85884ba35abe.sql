
-- =====================================================================
-- BILLING INTEGRATION LAYER — FASE 1: FUNDAÇÃO
-- =====================================================================
-- Camada opcional, desacoplada, para integração com providers externos
-- de faturação certificados (KeyInvoice, InvoiceXpress, Moloni, Vendus)
-- + modo manual_export. O Obra Sys NÃO emite faturação fiscal própria.
-- =====================================================================

-- ---------- ENUMS ----------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.billing_provider AS ENUM (
    'keyinvoice', 'invoicexpress', 'moloni', 'vendus', 'manual_export'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_environment AS ENUM ('sandbox', 'production');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_integration_status AS ENUM (
    'not_configured', 'configured', 'active', 'error', 'disabled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_document_type AS ENUM (
    'invoice', 'simplified_invoice', 'credit_note', 'debit_note',
    'receipt', 'proforma'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_internal_status AS ENUM (
    'draft', 'ready', 'queued', 'issuing', 'issued',
    'paid', 'partially_paid', 'credited', 'cancelled', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_source_type AS ENUM (
    'orcamento', 'auto_medicao', 'folha_fecho', 'mce_map', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 1. billing_integrations ----------------------------------

CREATE TABLE IF NOT EXISTS public.billing_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider public.billing_provider NOT NULL,
  environment public.billing_environment NOT NULL DEFAULT 'sandbox',
  status public.billing_integration_status NOT NULL DEFAULT 'not_configured',
  is_active boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  api_base_url text,
  account_id text,
  organization_external_id text,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  vault_secret_id uuid,                       -- referência opaca a vault.secrets
  token_expires_at timestamptz,
  last_connection_test_at timestamptz,
  last_connection_test_status text,
  last_sync_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_integrations_active_provider
  ON public.billing_integrations(organization_id, provider, environment)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_billing_integrations_org
  ON public.billing_integrations(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_integrations TO authenticated;
GRANT ALL ON public.billing_integrations TO service_role;

ALTER TABLE public.billing_integrations ENABLE ROW LEVEL SECURITY;

-- ---------- 2. billing_customers -------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.billing_integrations(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  external_customer_id text NOT NULL,
  external_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, cliente_id),
  UNIQUE (integration_id, external_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_org
  ON public.billing_customers(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_customers TO authenticated;
GRANT ALL ON public.billing_customers TO service_role;

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

-- ---------- 3. billing_documents -------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.billing_integrations(id) ON DELETE SET NULL,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,

  source_type public.billing_source_type NOT NULL,
  source_id uuid,
  source_revision integer NOT NULL DEFAULT 1,

  document_type public.billing_document_type NOT NULL,
  internal_status public.billing_internal_status NOT NULL DEFAULT 'draft',
  external_status text,

  -- valores congelados (calculados no backend, nunca confiados ao client)
  currency text NOT NULL DEFAULT 'EUR',
  subtotal_net numeric(14,2) NOT NULL DEFAULT 0,
  total_tax numeric(14,2) NOT NULL DEFAULT 0,
  total_retention numeric(14,2) NOT NULL DEFAULT 0,
  total_gross numeric(14,2) NOT NULL DEFAULT 0,
  total_payable numeric(14,2) NOT NULL DEFAULT 0,

  -- referências externas (preenchidas após emissão pelo provider)
  external_document_id text,
  external_number text,
  external_series text,
  external_issued_at timestamptz,
  external_pdf_url text,
  external_payload jsonb,

  idempotency_key text NOT NULL,
  credited_document_id uuid REFERENCES public.billing_documents(id) ON DELETE SET NULL,
  notes text,

  prepared_by uuid REFERENCES auth.users(id),
  prepared_at timestamptz,
  issued_by uuid REFERENCES auth.users(id),
  issued_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_documents_idempotency
  ON public.billing_documents(organization_id, idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_documents_external
  ON public.billing_documents(integration_id, external_document_id)
  WHERE external_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_documents_org_status
  ON public.billing_documents(organization_id, internal_status);
CREATE INDEX IF NOT EXISTS idx_billing_documents_obra
  ON public.billing_documents(obra_id);
CREATE INDEX IF NOT EXISTS idx_billing_documents_source
  ON public.billing_documents(source_type, source_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_documents TO authenticated;
GRANT ALL ON public.billing_documents TO service_role;

ALTER TABLE public.billing_documents ENABLE ROW LEVEL SECURITY;

-- ---------- 4. billing_document_lines --------------------------------

CREATE TABLE IF NOT EXISTS public.billing_document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.billing_documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  line_order integer NOT NULL DEFAULT 0,
  source_line_id uuid,
  code text,
  description text NOT NULL,
  unit text,
  quantity numeric(14,4) NOT NULL DEFAULT 0,
  unit_price numeric(14,4) NOT NULL DEFAULT 0,
  discount_pct numeric(6,3) NOT NULL DEFAULT 0,
  tax_rate numeric(6,3) NOT NULL DEFAULT 0,
  tax_exemption_code text,
  retention_rate numeric(6,3) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  retention_amount numeric(14,2) NOT NULL DEFAULT 0,
  gross_amount numeric(14,2) NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_document_lines_doc
  ON public.billing_document_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_billing_document_lines_org
  ON public.billing_document_lines(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_document_lines TO authenticated;
GRANT ALL ON public.billing_document_lines TO service_role;

ALTER TABLE public.billing_document_lines ENABLE ROW LEVEL SECURITY;

-- ---------- 5. billing_sync_logs -------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.billing_integrations(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.billing_documents(id) ON DELETE SET NULL,
  operation text NOT NULL,
  status text NOT NULL,                       -- success | error | skipped
  http_status integer,
  retry_count integer NOT NULL DEFAULT 0,
  idempotency_key text,
  error_code text,
  error_message text,
  request_payload jsonb,                      -- sanitizado pelo edge function
  response_payload jsonb,                     -- sanitizado pelo edge function
  duration_ms integer,
  triggered_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_sync_logs_org_created
  ON public.billing_sync_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_sync_logs_doc
  ON public.billing_sync_logs(document_id);

GRANT SELECT ON public.billing_sync_logs TO authenticated;
GRANT ALL ON public.billing_sync_logs TO service_role;

ALTER TABLE public.billing_sync_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- HELPER: permissão billing.<key> para o utilizador corrente
-- =====================================================================

CREATE OR REPLACE FUNCTION public.has_billing_permission(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.member_module_permissions p ON p.member_id = om.id
    WHERE om.user_id = auth.uid()
      AND om.member_status = 'active'
      AND p.module_code = 'billing.' || _perm
      AND p.can_view = true
  )
  OR public.is_org_admin();
$$;

REVOKE ALL ON FUNCTION public.has_billing_permission(text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_billing_permission(text) TO authenticated, service_role;

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- billing_integrations
DROP POLICY IF EXISTS bi_select ON public.billing_integrations;
CREATE POLICY bi_select ON public.billing_integrations
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('view'));

DROP POLICY IF EXISTS bi_insert ON public.billing_integrations;
CREATE POLICY bi_insert ON public.billing_integrations
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id()
              AND public.has_billing_permission('configure'));

DROP POLICY IF EXISTS bi_update ON public.billing_integrations;
CREATE POLICY bi_update ON public.billing_integrations
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('configure'))
  WITH CHECK (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS bi_delete ON public.billing_integrations;
CREATE POLICY bi_delete ON public.billing_integrations
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.is_org_admin());

-- billing_customers
DROP POLICY IF EXISTS bc_select ON public.billing_customers;
CREATE POLICY bc_select ON public.billing_customers
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('view'));

DROP POLICY IF EXISTS bc_mutate ON public.billing_customers;
CREATE POLICY bc_mutate ON public.billing_customers
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('prepare'))
  WITH CHECK (organization_id = public.get_user_org_id());

-- billing_documents
DROP POLICY IF EXISTS bd_select ON public.billing_documents;
CREATE POLICY bd_select ON public.billing_documents
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('view'));

DROP POLICY IF EXISTS bd_insert ON public.billing_documents;
CREATE POLICY bd_insert ON public.billing_documents
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id()
              AND public.has_billing_permission('prepare'));

DROP POLICY IF EXISTS bd_update ON public.billing_documents;
CREATE POLICY bd_update ON public.billing_documents
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('prepare'))
  WITH CHECK (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS bd_delete ON public.billing_documents;
CREATE POLICY bd_delete ON public.billing_documents
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.is_org_admin());

-- billing_document_lines
DROP POLICY IF EXISTS bdl_select ON public.billing_document_lines;
CREATE POLICY bdl_select ON public.billing_document_lines
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('view'));

DROP POLICY IF EXISTS bdl_mutate ON public.billing_document_lines;
CREATE POLICY bdl_mutate ON public.billing_document_lines
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('prepare'))
  WITH CHECK (organization_id = public.get_user_org_id());

-- billing_sync_logs (apenas leitura para humanos; INSERT só service_role)
DROP POLICY IF EXISTS bsl_select ON public.billing_sync_logs;
CREATE POLICY bsl_select ON public.billing_sync_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id()
         AND public.has_billing_permission('view_logs'));

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- updated_at em todas
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'billing_integrations','billing_customers','billing_documents','billing_document_lines'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
       CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- Bloqueia mutação de documentos emitidos
CREATE OR REPLACE FUNCTION public.prevent_issued_billing_document_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_statuses public.billing_internal_status[] := ARRAY[
    'issued','paid','partially_paid','credited','cancelled'
  ]::public.billing_internal_status[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.internal_status = ANY(protected_statuses) THEN
      RAISE EXCEPTION 'Cannot delete a billing document with status %', OLD.internal_status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.internal_status = ANY(protected_statuses) THEN
    -- só permite atualizar campos de sincronização/estado/auditoria
    IF NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.source_id IS DISTINCT FROM OLD.source_id
       OR NEW.source_type IS DISTINCT FROM OLD.source_type
       OR NEW.document_type IS DISTINCT FROM OLD.document_type
       OR NEW.subtotal_net IS DISTINCT FROM OLD.subtotal_net
       OR NEW.total_tax IS DISTINCT FROM OLD.total_tax
       OR NEW.total_retention IS DISTINCT FROM OLD.total_retention
       OR NEW.total_gross IS DISTINCT FROM OLD.total_gross
       OR NEW.total_payable IS DISTINCT FROM OLD.total_payable
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    THEN
      RAISE EXCEPTION 'Issued billing document is immutable for financial fields (status=%)', OLD.internal_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_billing_documents_protect ON public.billing_documents;
CREATE TRIGGER trg_billing_documents_protect
  BEFORE UPDATE OR DELETE ON public.billing_documents
  FOR EACH ROW EXECUTE FUNCTION public.prevent_issued_billing_document_mutation();

-- Bloqueia mutação de linhas de docs emitidos
CREATE OR REPLACE FUNCTION public.prevent_issued_billing_lines_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st public.billing_internal_status;
  doc_id uuid;
BEGIN
  doc_id := COALESCE(NEW.document_id, OLD.document_id);
  SELECT internal_status INTO st FROM public.billing_documents WHERE id = doc_id;
  IF st IN ('issued','paid','partially_paid','credited','cancelled') THEN
    RAISE EXCEPTION 'Cannot modify lines of an issued billing document (status=%)', st
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_billing_document_lines_protect ON public.billing_document_lines;
CREATE TRIGGER trg_billing_document_lines_protect
  BEFORE INSERT OR UPDATE OR DELETE ON public.billing_document_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_issued_billing_lines_mutation();

-- =====================================================================
-- VAULT HELPERS (apenas service_role; frontend nunca chama)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.billing_vault_put(
  p_integration_id uuid,
  p_payload jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_existing  uuid;
  v_name      text;
BEGIN
  SELECT vault_secret_id INTO v_existing
    FROM public.billing_integrations WHERE id = p_integration_id;

  v_name := 'billing_integration_' || p_integration_id::text;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, p_payload::text, v_name, 'Obra Sys billing credentials');
    v_secret_id := v_existing;
  ELSE
    v_secret_id := vault.create_secret(p_payload::text, v_name, 'Obra Sys billing credentials');
    UPDATE public.billing_integrations
       SET vault_secret_id = v_secret_id, updated_at = now()
     WHERE id = p_integration_id;
  END IF;

  RETURN v_secret_id;
END $$;

REVOKE ALL ON FUNCTION public.billing_vault_put(uuid, jsonb) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.billing_vault_put(uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.billing_vault_get(p_integration_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_value     text;
BEGIN
  SELECT vault_secret_id INTO v_secret_id
    FROM public.billing_integrations WHERE id = p_integration_id;
  IF v_secret_id IS NULL THEN RETURN NULL; END IF;

  SELECT decrypted_secret INTO v_value
    FROM vault.decrypted_secrets WHERE id = v_secret_id;
  IF v_value IS NULL THEN RETURN NULL; END IF;

  RETURN v_value::jsonb;
END $$;

REVOKE ALL ON FUNCTION public.billing_vault_get(uuid) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.billing_vault_get(uuid) TO service_role;

-- =====================================================================
-- VIEW SEGURA — mascara vault_secret_id para o frontend
-- =====================================================================

DROP VIEW IF EXISTS public.billing_integrations_safe;
CREATE VIEW public.billing_integrations_safe
WITH (security_invoker = true) AS
SELECT
  id, organization_id, provider, environment, status, is_active, name,
  api_base_url, account_id, organization_external_id, settings_json,
  (vault_secret_id IS NOT NULL) AS has_credentials,
  token_expires_at, last_connection_test_at, last_connection_test_status,
  last_sync_at, created_by, created_at, updated_at
FROM public.billing_integrations;

GRANT SELECT ON public.billing_integrations_safe TO authenticated, service_role;

-- =====================================================================
-- SEED — permissões do módulo 'billing' para admins existentes
-- =====================================================================

INSERT INTO public.member_module_permissions
  (member_id, module_code, can_view, can_create, can_update, can_delete)
SELECT om.id, perm.code, true, true, true, true
FROM public.organization_members om
CROSS JOIN (VALUES
  ('billing.view'),('billing.configure'),('billing.prepare'),
  ('billing.issue'),('billing.cancel'),('billing.credit_note'),
  ('billing.sync'),('billing.view_logs')
) AS perm(code)
WHERE om.role IN ('owner','admin')
  AND om.member_status = 'active'
ON CONFLICT (member_id, module_code) DO NOTHING;
