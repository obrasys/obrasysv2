
-- ============================================================
-- Plant Leitura Assistida — Tables
-- ============================================================

-- 1) plant_files
CREATE TABLE public.plant_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  total_sheets INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_files_org ON public.plant_files(organization_id);
CREATE INDEX idx_plant_files_obra ON public.plant_files(obra_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_files TO authenticated;
GRANT ALL ON public.plant_files TO service_role;
ALTER TABLE public.plant_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_files org members select" ON public.plant_files
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "plant_files org members insert" ON public.plant_files
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND uploaded_by = auth.uid());
CREATE POLICY "plant_files org members update" ON public.plant_files
  FOR UPDATE TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "plant_files org members delete" ON public.plant_files
  FOR DELETE TO authenticated USING (public.is_org_member(organization_id));

-- 2) plant_sheets
CREATE TABLE public.plant_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_file_id UUID NOT NULL REFERENCES public.plant_files(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  sheet_index INTEGER NOT NULL,
  sheet_name TEXT,
  discipline TEXT,
  floor_level TEXT,
  scale TEXT,
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  confidence NUMERIC(4,3),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_sheets_file ON public.plant_sheets(plant_file_id);
CREATE INDEX idx_plant_sheets_org ON public.plant_sheets(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_sheets TO authenticated;
GRANT ALL ON public.plant_sheets TO service_role;
ALTER TABLE public.plant_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_sheets org members select" ON public.plant_sheets
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "plant_sheets org members insert" ON public.plant_sheets
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "plant_sheets org members update" ON public.plant_sheets
  FOR UPDATE TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "plant_sheets org members delete" ON public.plant_sheets
  FOR DELETE TO authenticated USING (public.is_org_member(organization_id));

-- 3) plant_elements
CREATE TABLE public.plant_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_file_id UUID NOT NULL REFERENCES public.plant_files(id) ON DELETE CASCADE,
  plant_sheet_id UUID NOT NULL REFERENCES public.plant_sheets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  code TEXT,
  category TEXT,
  description TEXT,
  quantity NUMERIC(14,3),
  unit TEXT,
  dimensions_json JSONB,
  coordinates_json JSONB,
  source_text TEXT,
  confidence NUMERIC(4,3),
  status TEXT NOT NULL DEFAULT 'ok',
  read_method TEXT,
  validation_required BOOLEAN NOT NULL DEFAULT false,
  budget_chapter_suggestion TEXT,
  budget_item_suggestion TEXT,
  notes TEXT,
  sent_to_budget BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_elements_file ON public.plant_elements(plant_file_id);
CREATE INDEX idx_plant_elements_sheet ON public.plant_elements(plant_sheet_id);
CREATE INDEX idx_plant_elements_org ON public.plant_elements(organization_id);
CREATE INDEX idx_plant_elements_status ON public.plant_elements(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_elements TO authenticated;
GRANT ALL ON public.plant_elements TO service_role;
ALTER TABLE public.plant_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_elements org members select" ON public.plant_elements
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "plant_elements org members insert" ON public.plant_elements
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "plant_elements org members update" ON public.plant_elements
  FOR UPDATE TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "plant_elements org members delete" ON public.plant_elements
  FOR DELETE TO authenticated USING (public.is_org_member(organization_id));

-- 4) plant_element_reviews
CREATE TABLE public.plant_element_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_element_id UUID NOT NULL REFERENCES public.plant_elements(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  reviewed_by UUID NOT NULL,
  action TEXT NOT NULL,
  old_value_json JSONB,
  new_value_json JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_element_reviews_element ON public.plant_element_reviews(plant_element_id);
CREATE INDEX idx_plant_element_reviews_org ON public.plant_element_reviews(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_element_reviews TO authenticated;
GRANT ALL ON public.plant_element_reviews TO service_role;
ALTER TABLE public.plant_element_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_element_reviews org members select" ON public.plant_element_reviews
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "plant_element_reviews org members insert" ON public.plant_element_reviews
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND reviewed_by = auth.uid());

-- 5) plant_budget_exports
CREATE TABLE public.plant_budget_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  plant_file_id UUID NOT NULL REFERENCES public.plant_files(id) ON DELETE CASCADE,
  budget_id UUID,
  exported_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  items_exported INTEGER NOT NULL DEFAULT 0,
  details_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_budget_exports_org ON public.plant_budget_exports(organization_id);
CREATE INDEX idx_plant_budget_exports_file ON public.plant_budget_exports(plant_file_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_budget_exports TO authenticated;
GRANT ALL ON public.plant_budget_exports TO service_role;
ALTER TABLE public.plant_budget_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_budget_exports org members select" ON public.plant_budget_exports
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "plant_budget_exports org members insert" ON public.plant_budget_exports
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND exported_by = auth.uid());

-- 6) plant_processing_logs
CREATE TABLE public.plant_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  obra_id UUID,
  plant_file_id UUID REFERENCES public.plant_files(id) ON DELETE CASCADE,
  plant_sheet_id UUID REFERENCES public.plant_sheets(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  details_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_processing_logs_file ON public.plant_processing_logs(plant_file_id);
CREATE INDEX idx_plant_processing_logs_sheet ON public.plant_processing_logs(plant_sheet_id);
CREATE INDEX idx_plant_processing_logs_org ON public.plant_processing_logs(organization_id);

GRANT SELECT, INSERT ON public.plant_processing_logs TO authenticated;
GRANT ALL ON public.plant_processing_logs TO service_role;
ALTER TABLE public.plant_processing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_processing_logs org members select" ON public.plant_processing_logs
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_plant_files_updated_at BEFORE UPDATE ON public.plant_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plant_sheets_updated_at BEFORE UPDATE ON public.plant_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plant_elements_updated_at BEFORE UPDATE ON public.plant_elements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Origem rastreável no artigo de orçamento
-- ============================================================
ALTER TABLE public.artigos_orcamento
  ADD COLUMN IF NOT EXISTS plant_source JSONB;
