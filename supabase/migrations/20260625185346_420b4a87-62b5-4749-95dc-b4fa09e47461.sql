
-- ============================================================
-- Fase 1: Evolução Orçamento Essencial (aditiva)
-- ============================================================

-- 1. Adicionar context às bibliotecas e tabelas operacionais
ALTER TABLE public.org_zone_library    ADD COLUMN IF NOT EXISTS context text;
ALTER TABLE public.org_area_library    ADD COLUMN IF NOT EXISTS context text;
ALTER TABLE public.budget_zones        ADD COLUMN IF NOT EXISTS context text;
ALTER TABLE public.budget_areas        ADD COLUMN IF NOT EXISTS context text;

ALTER TABLE public.org_zone_library    ADD CONSTRAINT chk_zone_lib_context CHECK (context IS NULL OR context IN ('interior','exterior','geral'));
ALTER TABLE public.org_area_library    ADD CONSTRAINT chk_area_lib_context CHECK (context IS NULL OR context IN ('interior','exterior','geral'));
ALTER TABLE public.budget_zones        ADD CONSTRAINT chk_budget_zones_context CHECK (context IS NULL OR context IN ('interior','exterior','geral'));
ALTER TABLE public.budget_areas        ADD CONSTRAINT chk_budget_areas_context CHECK (context IS NULL OR context IN ('interior','exterior','geral'));

-- 2. Artigos do orçamento: contexto, IVAs por componente, ligação ao catálogo
ALTER TABLE public.artigos_orcamento
  ADD COLUMN IF NOT EXISTS intervention_context text,
  ADD COLUMN IF NOT EXISTS labor_vat_rate numeric,
  ADD COLUMN IF NOT EXISTS material_vat_rate numeric,
  ADD COLUMN IF NOT EXISTS catalog_article_id uuid;

ALTER TABLE public.artigos_orcamento
  ADD CONSTRAINT chk_artigos_intervention_context
  CHECK (intervention_context IS NULL OR intervention_context IN ('interior','exterior','geral'));

ALTER TABLE public.artigos_orcamento
  ADD CONSTRAINT artigos_orcamento_catalog_article_id_fkey
  FOREIGN KEY (catalog_article_id) REFERENCES public.base_artigos_user(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_artigos_orcamento_catalog ON public.artigos_orcamento(catalog_article_id) WHERE catalog_article_id IS NOT NULL;

-- 3. Meu Catálogo (base_artigos_user) — campos para evolução
ALTER TABLE public.base_artigos_user
  ADD COLUMN IF NOT EXISTS subcontract_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rental_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS miscellaneous_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intervention_context text,
  ADD COLUMN IF NOT EXISTS area_id uuid,
  ADD COLUMN IF NOT EXISTS service_type_id uuid,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

ALTER TABLE public.base_artigos_user
  ADD CONSTRAINT chk_base_user_context
  CHECK (intervention_context IS NULL OR intervention_context IN ('interior','exterior','geral'));

ALTER TABLE public.base_artigos_user
  ADD CONSTRAINT base_artigos_user_area_id_fkey
  FOREIGN KEY (area_id) REFERENCES public.org_area_library(id) ON DELETE SET NULL;

ALTER TABLE public.base_artigos_user
  ADD CONSTRAINT base_artigos_user_service_type_id_fkey
  FOREIGN KEY (service_type_id) REFERENCES public.org_service_type_library(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_base_user_area ON public.base_artigos_user(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_base_user_service_type ON public.base_artigos_user(service_type_id) WHERE service_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_base_user_last_used ON public.base_artigos_user(organization_id, last_used_at DESC);

-- 4. Tabela: Configuração fiscal por organização
CREATE TABLE IF NOT EXISTS public.organization_tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  country text NOT NULL DEFAULT 'PT',
  region text NOT NULL DEFAULT 'continente',
  labor_vat_rate numeric(5,2) NOT NULL DEFAULT 6,
  material_vat_rate numeric(5,2) NOT NULL DEFAULT 23,
  default_vat_rate numeric(5,2) NOT NULL DEFAULT 23,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_tax_settings TO authenticated;
GRANT ALL ON public.organization_tax_settings TO service_role;

ALTER TABLE public.organization_tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_settings_select" ON public.organization_tax_settings
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "tax_settings_insert" ON public.organization_tax_settings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "tax_settings_update" ON public.organization_tax_settings
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "tax_settings_delete" ON public.organization_tax_settings
  FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER trg_tax_settings_updated_at BEFORE UPDATE ON public.organization_tax_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Tabela: Condições comerciais reutilizáveis
CREATE TABLE IF NOT EXISTS public.organization_budget_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_budget_terms TO authenticated;
GRANT ALL ON public.organization_budget_terms TO service_role;

ALTER TABLE public.organization_budget_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_terms_select" ON public.organization_budget_terms
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "budget_terms_insert" ON public.organization_budget_terms
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "budget_terms_update" ON public.organization_budget_terms
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "budget_terms_delete" ON public.organization_budget_terms
  FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_budget_terms_org_default ON public.organization_budget_terms(organization_id, is_default DESC, last_used_at DESC);

CREATE TRIGGER trg_budget_terms_updated_at BEFORE UPDATE ON public.organization_budget_terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
