
-- ============================================================
-- Orçamento & RAI da Obra — Modelo de dados consolidado (Fase 2)
-- Objetivo: representar o ciclo financeiro (Budget → Forecast → Outturn → Aftercare)
-- consumindo as fontes existentes (orcamentos, closing_sheets, mce_records,
-- contracting_packages, autos_medicao, contas_financeiras) SEM duplicar dados.
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.financial_phase AS ENUM ('budget','forecast','outturn','aftercare');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_cycle_status AS ENUM ('draft','active','locked','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_source_module AS ENUM (
    'orcamento','closing_sheet','mce','contracting_package','auto_medicao',
    'conta_financeira','purchase','aftercare','manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_line_nature AS ENUM ('venda','custo_direto','custo_indireto','estaleiro','estrutura','contingencia','spv','retencao','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.aftercare_status AS ENUM ('aberto','em_analise','resolvido','rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.retention_status AS ENUM ('retida','liberada_parcial','liberada_total','executada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1) financial_work_cycles — ciclo financeiro por obra/fase
-- Snapshot/lock por fase. Uma obra tem até 1 ciclo por fase.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_work_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  phase public.financial_phase NOT NULL,
  status public.financial_cycle_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  -- KPIs consolidados (cache para leitura rápida; fonte é financial_work_documents)
  total_vendas NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_custos NUMERIC(14,2) NOT NULL DEFAULT 0,
  margem_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  margem_pct NUMERIC(7,4) NOT NULL DEFAULT 0,
  rai NUMERIC(14,2) NOT NULL DEFAULT 0,
  desvio_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  impacto_mce NUMERIC(14,2) NOT NULL DEFAULT 0,
  custos_spv NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Snapshot/lock
  snapshot JSONB,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (obra_id, phase, version)
);

CREATE INDEX IF NOT EXISTS idx_fwc_obra ON public.financial_work_cycles(obra_id);
CREATE INDEX IF NOT EXISTS idx_fwc_org ON public.financial_work_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_fwc_phase ON public.financial_work_cycles(obra_id, phase, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_work_cycles TO authenticated;
GRANT ALL ON public.financial_work_cycles TO service_role;

ALTER TABLE public.financial_work_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fwc_select_org" ON public.financial_work_cycles FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwc_insert_own" ON public.financial_work_cycles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwc_update_org" ON public.financial_work_cycles FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwc_delete_org" ON public.financial_work_cycles FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================
-- 2) financial_source_links — anti-duplicação
-- Garante que um documento de origem (ex.: orcamento X) entra UMA vez por fase.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  cycle_id UUID NOT NULL REFERENCES public.financial_work_cycles(id) ON DELETE CASCADE,
  phase public.financial_phase NOT NULL,
  source_module public.financial_source_module NOT NULL,
  source_id UUID NOT NULL,
  source_label TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  weight NUMERIC(7,4) NOT NULL DEFAULT 1, -- fator para evitar dupla contagem (1 = total, 0.5 = metade)
  ignored BOOLEAN NOT NULL DEFAULT false,
  ignored_reason TEXT,
  consolidated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (obra_id, phase, source_module, source_id)
);

CREATE INDEX IF NOT EXISTS idx_fsl_cycle ON public.financial_source_links(cycle_id);
CREATE INDEX IF NOT EXISTS idx_fsl_source ON public.financial_source_links(source_module, source_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_source_links TO authenticated;
GRANT ALL ON public.financial_source_links TO service_role;

ALTER TABLE public.financial_source_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fsl_select_org" ON public.financial_source_links FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fsl_insert_org" ON public.financial_source_links FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fsl_update_org" ON public.financial_source_links FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fsl_delete_org" ON public.financial_source_links FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================
-- 3) financial_work_documents — catálogo de documentos consolidados por ciclo
-- Cabeçalhos (referência aos módulos fonte; sem duplicar linhas internas).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_work_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  cycle_id UUID NOT NULL REFERENCES public.financial_work_cycles(id) ON DELETE CASCADE,
  source_link_id UUID REFERENCES public.financial_source_links(id) ON DELETE SET NULL,
  source_module public.financial_source_module NOT NULL,
  source_id UUID,
  doc_code TEXT,
  doc_title TEXT,
  doc_date DATE,
  vendor_id UUID,
  cost_center_id UUID,
  total_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_reference BOOLEAN NOT NULL DEFAULT false, -- true para Budget/baseline
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fwd_cycle ON public.financial_work_documents(cycle_id);
CREATE INDEX IF NOT EXISTS idx_fwd_obra ON public.financial_work_documents(obra_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_work_documents TO authenticated;
GRANT ALL ON public.financial_work_documents TO service_role;

ALTER TABLE public.financial_work_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fwd_select_org" ON public.financial_work_documents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwd_insert_org" ON public.financial_work_documents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwd_update_org" ON public.financial_work_documents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwd_delete_org" ON public.financial_work_documents FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================
-- 4) financial_work_lines — linhas agregadas por natureza/família para RAI
-- (não duplica linhas dos orçamentos; agrega por capítulo/família/natureza)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_work_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  cycle_id UUID NOT NULL REFERENCES public.financial_work_cycles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.financial_work_documents(id) ON DELETE CASCADE,
  nature public.financial_line_nature NOT NULL,
  chapter_code TEXT,        -- ex.: AAA.000
  family_code TEXT,         -- família/categoria
  description TEXT,
  quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit TEXT,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_sale NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_sale NUMERIC(14,2) NOT NULL DEFAULT 0,
  margin_pct NUMERIC(7,4) NOT NULL DEFAULT 0,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fwl_cycle ON public.financial_work_lines(cycle_id);
CREATE INDEX IF NOT EXISTS idx_fwl_doc ON public.financial_work_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_fwl_chapter ON public.financial_work_lines(obra_id, chapter_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_work_lines TO authenticated;
GRANT ALL ON public.financial_work_lines TO service_role;

ALTER TABLE public.financial_work_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fwline_select_org" ON public.financial_work_lines FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwline_insert_org" ON public.financial_work_lines FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwline_update_org" ON public.financial_work_lines FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "fwline_delete_org" ON public.financial_work_lines FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================
-- 5) guarantee_retentions — retenções de garantia por obra/fornecedor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guarantee_retentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.financial_work_cycles(id) ON DELETE SET NULL,
  source_module public.financial_source_module,
  source_id UUID,
  supplier_id UUID,
  description TEXT,
  retained_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  released_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  released_at DATE,
  status public.retention_status NOT NULL DEFAULT 'retida',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gr_obra ON public.guarantee_retentions(obra_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarantee_retentions TO authenticated;
GRANT ALL ON public.guarantee_retentions TO service_role;

ALTER TABLE public.guarantee_retentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gr_select_org" ON public.guarantee_retentions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "gr_insert_own" ON public.guarantee_retentions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "gr_update_org" ON public.guarantee_retentions FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "gr_delete_org" ON public.guarantee_retentions FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================
-- 6) aftercare_records — registos de pós-venda (SPV)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aftercare_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.financial_work_cycles(id) ON DELETE SET NULL,
  cost_center_id UUID,
  reference TEXT,
  description TEXT,
  category TEXT,
  reported_at DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_at DATE,
  cost_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.aftercare_status NOT NULL DEFAULT 'aberto',
  supplier_id UUID,
  attachments JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_obra ON public.aftercare_records(obra_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON public.aftercare_records(obra_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aftercare_records TO authenticated;
GRANT ALL ON public.aftercare_records TO service_role;

ALTER TABLE public.aftercare_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_select_org" ON public.aftercare_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ar_insert_own" ON public.aftercare_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ar_update_org" ON public.aftercare_records FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ar_delete_org" ON public.aftercare_records FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================
-- Triggers de updated_at
-- ============================================================
CREATE TRIGGER trg_fwc_updated BEFORE UPDATE ON public.financial_work_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fsl_updated BEFORE UPDATE ON public.financial_source_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fwd_updated BEFORE UPDATE ON public.financial_work_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fwl_updated BEFORE UPDATE ON public.financial_work_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_gr_updated BEFORE UPDATE ON public.guarantee_retentions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ar_updated BEFORE UPDATE ON public.aftercare_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
