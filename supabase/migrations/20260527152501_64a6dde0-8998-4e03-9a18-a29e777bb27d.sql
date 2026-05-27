
-- ============== 1. icf_project_analyses (dossiê) ==============
CREATE TABLE public.icf_project_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  configuracao_id uuid REFERENCES public.icf_configuracoes(id) ON DELETE SET NULL,
  analysis_mode text NOT NULL DEFAULT 'complete_icf_project' CHECK (analysis_mode IN ('architectural_to_icf','complete_icf_project','ifc_bim')),
  titulo text NOT NULL,
  descricao text,
  sistema_icf text DEFAULT 'HOMEBLOCK',
  espessura_nucleo_mm numeric(8,2),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_classificacao','em_revisao','validado','enviado_orcamento','arquivado')),
  axia_confidence numeric(5,2),
  axia_summary jsonb,
  totals_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_icf_analyses_empresa ON public.icf_project_analyses(empresa_id);
CREATE INDEX idx_icf_analyses_obra ON public.icf_project_analyses(obra_id);
CREATE INDEX idx_icf_analyses_status ON public.icf_project_analyses(empresa_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_project_analyses TO authenticated;
GRANT ALL ON public.icf_project_analyses TO service_role;

ALTER TABLE public.icf_project_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "icf_analyses_select" ON public.icf_project_analyses FOR SELECT TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_analyses_insert" ON public.icf_project_analyses FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_analyses_update" ON public.icf_project_analyses FOR UPDATE TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_analyses_delete" ON public.icf_project_analyses FOR DELETE TO authenticated USING (empresa_id = public.get_user_org_id());

CREATE TRIGGER update_icf_analyses_updated_at BEFORE UPDATE ON public.icf_project_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== 2. icf_project_documents ==============
CREATE TABLE public.icf_project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  analysis_id uuid NOT NULL REFERENCES public.icf_project_analyses(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  user_category text CHECK (user_category IN ('planta','corte','alcado','detalhe','mapa_vaos','fundacao','memoria_descritiva','outro')),
  axia_category text CHECK (axia_category IN ('planta','corte','alcado','detalhe','mapa_vaos','fundacao','memoria_descritiva','outro')),
  axia_confidence numeric(5,2),
  axia_summary text,
  page_count integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','classified','reviewed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_icf_docs_analysis ON public.icf_project_documents(analysis_id);
CREATE INDEX idx_icf_docs_empresa ON public.icf_project_documents(empresa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_project_documents TO authenticated;
GRANT ALL ON public.icf_project_documents TO service_role;

ALTER TABLE public.icf_project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "icf_docs_select" ON public.icf_project_documents FOR SELECT TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_docs_insert" ON public.icf_project_documents FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_docs_update" ON public.icf_project_documents FOR UPDATE TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_docs_delete" ON public.icf_project_documents FOR DELETE TO authenticated USING (empresa_id = public.get_user_org_id());

CREATE TRIGGER update_icf_docs_updated_at BEFORE UPDATE ON public.icf_project_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== 3. icf_project_checklist_items ==============
CREATE TABLE public.icf_project_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  analysis_id uuid NOT NULL REFERENCES public.icf_project_analyses(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','present','partial','missing','na')),
  notes text,
  related_document_id uuid REFERENCES public.icf_project_documents(id) ON DELETE SET NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, item_key)
);
CREATE INDEX idx_icf_checklist_analysis ON public.icf_project_checklist_items(analysis_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_project_checklist_items TO authenticated;
GRANT ALL ON public.icf_project_checklist_items TO service_role;

ALTER TABLE public.icf_project_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "icf_checklist_select" ON public.icf_project_checklist_items FOR SELECT TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_checklist_insert" ON public.icf_project_checklist_items FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_checklist_update" ON public.icf_project_checklist_items FOR UPDATE TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_checklist_delete" ON public.icf_project_checklist_items FOR DELETE TO authenticated USING (empresa_id = public.get_user_org_id());

CREATE TRIGGER update_icf_checklist_updated_at BEFORE UPDATE ON public.icf_project_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== 4. icf_project_issues ==============
CREATE TABLE public.icf_project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  analysis_id uuid NOT NULL REFERENCES public.icf_project_analyses(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','error','critical')),
  category text NOT NULL CHECK (category IN ('missing_document','low_confidence','inconsistency','pending_review','calibration','other')),
  title text NOT NULL,
  message text,
  related_document_id uuid REFERENCES public.icf_project_documents(id) ON DELETE SET NULL,
  related_panel_id uuid REFERENCES public.icf_wall_panels(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_icf_issues_analysis ON public.icf_project_issues(analysis_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_project_issues TO authenticated;
GRANT ALL ON public.icf_project_issues TO service_role;

ALTER TABLE public.icf_project_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "icf_issues_select" ON public.icf_project_issues FOR SELECT TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_issues_insert" ON public.icf_project_issues FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_issues_update" ON public.icf_project_issues FOR UPDATE TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_issues_delete" ON public.icf_project_issues FOR DELETE TO authenticated USING (empresa_id = public.get_user_org_id());

CREATE TRIGGER update_icf_issues_updated_at BEFORE UPDATE ON public.icf_project_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== 5. icf_analysis_snapshots ==============
CREATE TABLE public.icf_analysis_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  analysis_id uuid NOT NULL REFERENCES public.icf_project_analyses(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text,
  payload jsonb NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, version_number)
);
CREATE INDEX idx_icf_snapshots_analysis ON public.icf_analysis_snapshots(analysis_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_analysis_snapshots TO authenticated;
GRANT ALL ON public.icf_analysis_snapshots TO service_role;

ALTER TABLE public.icf_analysis_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "icf_snapshots_select" ON public.icf_analysis_snapshots FOR SELECT TO authenticated USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_snapshots_insert" ON public.icf_analysis_snapshots FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_snapshots_delete" ON public.icf_analysis_snapshots FOR DELETE TO authenticated USING (empresa_id = public.get_user_org_id());

-- ============== 6. Ligar icf_wall_panels ao dossiê ==============
ALTER TABLE public.icf_wall_panels
  ADD COLUMN IF NOT EXISTS analysis_id uuid REFERENCES public.icf_project_analyses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_icf_wall_panels_analysis ON public.icf_wall_panels(analysis_id);
