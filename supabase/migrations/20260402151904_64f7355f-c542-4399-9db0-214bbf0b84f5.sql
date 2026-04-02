
-- Plan Imports table
CREATE TABLE public.plan_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  nome_ficheiro TEXT NOT NULL,
  disciplina TEXT NOT NULL DEFAULT 'arquitetura',
  revision_number INT NOT NULL DEFAULT 1,
  data_planta DATE,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plan imports" ON public.plan_imports
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can create plan imports" ON public.plan_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update plan imports" ON public.plan_imports
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can delete plan imports" ON public.plan_imports
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));

CREATE TRIGGER update_plan_imports_updated_at
  BEFORE UPDATE ON public.plan_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plan Calibrations table
CREATE TABLE public.plan_calibrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_import_id UUID NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  point1 JSONB NOT NULL DEFAULT '{"x":0,"y":0}',
  point2 JSONB NOT NULL DEFAULT '{"x":0,"y":0}',
  real_distance NUMERIC NOT NULL DEFAULT 1,
  pixels_per_meter NUMERIC NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'm',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view calibrations" ON public.plan_calibrations
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can create calibrations" ON public.plan_calibrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update calibrations" ON public.plan_calibrations
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can delete calibrations" ON public.plan_calibrations
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));

CREATE TRIGGER update_plan_calibrations_updated_at
  BEFORE UPDATE ON public.plan_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plan Measurements table
CREATE TABLE public.plan_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_import_id UUID NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'linha',
  coordinates JSONB NOT NULL DEFAULT '[]',
  valor_bruto NUMERIC NOT NULL DEFAULT 0,
  valor_ajustado NUMERIC,
  valor_final NUMERIC,
  unidade TEXT NOT NULL DEFAULT 'm',
  camada TEXT,
  etiqueta TEXT,
  cor TEXT DEFAULT '#3b82f6',
  observacao TEXT,
  estado_validacao TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view measurements" ON public.plan_measurements
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can create measurements" ON public.plan_measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update measurements" ON public.plan_measurements
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can delete measurements" ON public.plan_measurements
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));

CREATE TRIGGER update_plan_measurements_updated_at
  BEFORE UPDATE ON public.plan_measurements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plan Measurement Mappings table
CREATE TABLE public.plan_measurement_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  measurement_id UUID NOT NULL REFERENCES public.plan_measurements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  capitulo_id UUID REFERENCES public.capitulos_orcamento(id),
  artigo_base_id UUID REFERENCES public.base_precos_personalizada(id),
  unidade_artigo TEXT,
  formula_conversao TEXT,
  fator_desperdicio NUMERIC NOT NULL DEFAULT 1.0,
  coeficiente NUMERIC NOT NULL DEFAULT 1.0,
  estado TEXT NOT NULL DEFAULT 'por_mapear',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_measurement_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mappings" ON public.plan_measurement_mappings
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can create mappings" ON public.plan_measurement_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update mappings" ON public.plan_measurement_mappings
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can delete mappings" ON public.plan_measurement_mappings
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));

CREATE TRIGGER update_plan_measurement_mappings_updated_at
  BEFORE UPDATE ON public.plan_measurement_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plan Budget Links table
CREATE TABLE public.plan_budget_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  measurement_id UUID NOT NULL REFERENCES public.plan_measurements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  artigo_orcamento_id UUID NOT NULL REFERENCES public.artigos_orcamento(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_budget_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view budget links" ON public.plan_budget_links
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can create budget links" ON public.plan_budget_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can delete budget links" ON public.plan_budget_links
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));

-- Storage bucket for plan files
INSERT INTO storage.buckets (id, name, public) VALUES ('plan-files', 'plan-files', true);

CREATE POLICY "Authenticated users can upload plan files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'plan-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view plan files" ON storage.objects
  FOR SELECT USING (bucket_id = 'plan-files');

CREATE POLICY "Authenticated users can update plan files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'plan-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete plan files" ON storage.objects
  FOR DELETE USING (bucket_id = 'plan-files' AND auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_plan_imports_obra_id ON public.plan_imports(obra_id);
CREATE INDEX idx_plan_imports_user_id ON public.plan_imports(user_id);
CREATE INDEX idx_plan_calibrations_plan_id ON public.plan_calibrations(plan_import_id);
CREATE INDEX idx_plan_measurements_plan_id ON public.plan_measurements(plan_import_id);
CREATE INDEX idx_plan_measurement_mappings_measurement_id ON public.plan_measurement_mappings(measurement_id);
CREATE INDEX idx_plan_budget_links_measurement_id ON public.plan_budget_links(measurement_id);
CREATE INDEX idx_plan_budget_links_orcamento_id ON public.plan_budget_links(orcamento_id);
