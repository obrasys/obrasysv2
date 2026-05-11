
-- =====================================================================
-- ESPECIALIDADES — Plantas técnicas (elétrica, águas, esgotos, AVAC,
-- telecomunicações, gás, segurança).  Reaproveita storage 'plan-files'
-- e padrões de RLS de plan_imports.
-- =====================================================================

-- 1) specialty_plans ---------------------------------------------------
CREATE TABLE public.specialty_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  nome_ficheiro TEXT NOT NULL,
  specialty_type TEXT NOT NULL CHECK (specialty_type IN
    ('eletrica','canalizacao','esgotos','avac','telecomunicacoes','gas','seguranca','outra')),
  floor_level TEXT,
  declared_scale TEXT,
  estimated_scale TEXT,
  calibration_data JSONB,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN
    ('uploaded','analyzing','analyzed','review_required','validated','sent_to_budget','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_specialty_plans_obra ON public.specialty_plans(obra_id, specialty_type);
CREATE INDEX idx_specialty_plans_user ON public.specialty_plans(user_id);

ALTER TABLE public.specialty_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org can view specialty plans" ON public.specialty_plans
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can insert specialty plans" ON public.specialty_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org can update specialty plans" ON public.specialty_plans
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can delete specialty plans" ON public.specialty_plans
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));
CREATE TRIGGER trg_specialty_plans_updated_at BEFORE UPDATE ON public.specialty_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) specialty_plan_analysis ------------------------------------------
CREATE TABLE public.specialty_plan_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty_plan_id UUID NOT NULL REFERENCES public.specialty_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ai_model TEXT,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  confidence_score NUMERIC,
  review_required BOOLEAN NOT NULL DEFAULT true,
  summary TEXT,
  warnings TEXT[] DEFAULT ARRAY[]::TEXT[],
  missing_information TEXT[] DEFAULT ARRAY[]::TEXT[],
  raw_response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_specialty_plan_analysis_plan ON public.specialty_plan_analysis(specialty_plan_id);

ALTER TABLE public.specialty_plan_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org can view specialty analysis" ON public.specialty_plan_analysis
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can insert specialty analysis" ON public.specialty_plan_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org can update specialty analysis" ON public.specialty_plan_analysis
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can delete specialty analysis" ON public.specialty_plan_analysis
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));

-- 3) specialty_detected_elements --------------------------------------
CREATE TABLE public.specialty_detected_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty_plan_id UUID NOT NULL REFERENCES public.specialty_plans(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.specialty_plan_analysis(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  symbol_type TEXT NOT NULL,
  specialty_type TEXT NOT NULL,
  label TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'un',
  x_position NUMERIC,
  y_position NUMERIC,
  bounding_box JSONB,
  page_number INT NOT NULL DEFAULT 1,
  floor_level TEXT,
  confidence_score NUMERIC,
  review_required BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','axia','imported')),
  user_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_specialty_elements_plan ON public.specialty_detected_elements(specialty_plan_id);
CREATE INDEX idx_specialty_elements_symbol ON public.specialty_detected_elements(specialty_plan_id, symbol_type);

ALTER TABLE public.specialty_detected_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org can view specialty elements" ON public.specialty_detected_elements
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can insert specialty elements" ON public.specialty_detected_elements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org can update specialty elements" ON public.specialty_detected_elements
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can delete specialty elements" ON public.specialty_detected_elements
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));
CREATE TRIGGER trg_specialty_elements_updated_at BEFORE UPDATE ON public.specialty_detected_elements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) specialty_measurements -------------------------------------------
CREATE TABLE public.specialty_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty_plan_id UUID NOT NULL REFERENCES public.specialty_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  specialty_type TEXT NOT NULL,
  measurement_type TEXT NOT NULL DEFAULT 'linear',
  symbol_type TEXT,
  label TEXT,
  points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'm',
  calculation_basis TEXT,
  confidence_score NUMERIC,
  review_required BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual',
  user_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_specialty_measurements_plan ON public.specialty_measurements(specialty_plan_id);

ALTER TABLE public.specialty_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org can view specialty measurements" ON public.specialty_measurements
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can insert specialty measurements" ON public.specialty_measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org can update specialty measurements" ON public.specialty_measurements
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can delete specialty measurements" ON public.specialty_measurements
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));
CREATE TRIGGER trg_specialty_measurements_updated_at BEFORE UPDATE ON public.specialty_measurements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) specialty_quantity_items -----------------------------------------
CREATE TABLE public.specialty_quantity_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty_plan_id UUID NOT NULL REFERENCES public.specialty_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  specialty_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  source_type TEXT NOT NULL DEFAULT 'aggregated',
  source_id UUID,
  confidence_score NUMERIC,
  review_required BOOLEAN NOT NULL DEFAULT false,
  budget_item_id UUID,
  sent_to_budget BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_specialty_qty_plan ON public.specialty_quantity_items(specialty_plan_id);
CREATE INDEX idx_specialty_qty_sent ON public.specialty_quantity_items(sent_to_budget);

ALTER TABLE public.specialty_quantity_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org can view specialty qty" ON public.specialty_quantity_items
  FOR SELECT USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can insert specialty qty" ON public.specialty_quantity_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org can update specialty qty" ON public.specialty_quantity_items
  FOR UPDATE USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org can delete specialty qty" ON public.specialty_quantity_items
  FOR DELETE USING (user_id = ANY(public.get_org_member_ids()));
CREATE TRIGGER trg_specialty_qty_updated_at BEFORE UPDATE ON public.specialty_quantity_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) specialty_symbol_library (global) --------------------------------
CREATE TABLE public.specialty_symbol_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty_type TEXT NOT NULL,
  symbol_key TEXT NOT NULL UNIQUE,
  symbol_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  description TEXT,
  icon TEXT,
  default_budget_category TEXT,
  default_budget_item_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_specialty_symbols_type ON public.specialty_symbol_library(specialty_type, active);

ALTER TABLE public.specialty_symbol_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read symbols" ON public.specialty_symbol_library
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can write symbols" ON public.specialty_symbol_library
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE TRIGGER trg_specialty_symbols_updated_at BEFORE UPDATE ON public.specialty_symbol_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- SEED — biblioteca inicial de símbolos por especialidade
-- =====================================================================
INSERT INTO public.specialty_symbol_library (specialty_type, symbol_key, symbol_name, unit, default_budget_category, default_budget_item_name) VALUES
-- Elétrica
('eletrica','tomada_simples','Tomada simples','un','Elétrica','Tomada elétrica simples'),
('eletrica','tomada_dupla','Tomada dupla','un','Elétrica','Tomada elétrica dupla'),
('eletrica','interruptor_simples','Interruptor simples','un','Elétrica','Interruptor simples'),
('eletrica','interruptor_duplo','Interruptor duplo','un','Elétrica','Interruptor duplo'),
('eletrica','ponto_luz_teto','Ponto de luz teto','un','Elétrica','Ponto de luz no teto'),
('eletrica','ponto_luz_parede','Ponto de luz parede','un','Elétrica','Ponto de luz na parede'),
('eletrica','quadro_eletrico','Quadro elétrico','un','Elétrica','Quadro elétrico'),
('eletrica','sensor_presenca','Sensor de presença','un','Elétrica','Sensor de presença'),
('eletrica','campainha','Campainha','un','Elétrica','Campainha elétrica'),
('eletrica','ponto_alimentacao_dedicado','Ponto de alimentação dedicado','un','Elétrica','Ponto de alimentação dedicado'),
('eletrica','tubagem_eletrica','Tubagem elétrica','m','Elétrica','Tubagem elétrica'),
('eletrica','eletrocalha','Eletrocalha','m','Elétrica','Eletrocalha'),
-- Canalização / águas
('canalizacao','ponto_agua_fria','Ponto de água fria','un','Canalização','Ponto de água fria'),
('canalizacao','ponto_agua_quente','Ponto de água quente','un','Canalização','Ponto de água quente'),
('canalizacao','lavatorio','Lavatório','un','Canalização','Lavatório'),
('canalizacao','sanita','Sanita','un','Canalização','Sanita'),
('canalizacao','bide','Bidé','un','Canalização','Bidé'),
('canalizacao','duche','Duche','un','Canalização','Base de duche'),
('canalizacao','banheira','Banheira','un','Canalização','Banheira'),
('canalizacao','lava_louca','Lava-loiça','un','Canalização','Lava-loiça'),
('canalizacao','maquina_lavar_roupa','Máquina lavar roupa','un','Canalização','Ligação máquina de lavar roupa'),
('canalizacao','maquina_lavar_loica','Máquina lavar loiça','un','Canalização','Ligação máquina de lavar loiça'),
('canalizacao','valvula','Válvula','un','Canalização','Válvula de seccionamento'),
('canalizacao','coletor','Coletor','un','Canalização','Coletor'),
('canalizacao','prumada_agua','Prumada de água','m','Canalização','Prumada de água'),
-- Esgotos
('esgotos','ponto_esgoto','Ponto de esgoto','un','Esgotos','Ponto de esgoto'),
('esgotos','caixa_visita','Caixa de visita','un','Esgotos','Caixa de visita'),
('esgotos','ralo','Ralo','un','Esgotos','Ralo'),
('esgotos','sifao','Sifão','un','Esgotos','Sifão'),
('esgotos','prumada_esgoto','Prumada de esgoto','m','Esgotos','Prumada de esgoto'),
('esgotos','ramal_esgoto','Ramal de esgoto','m','Esgotos','Ramal de esgoto'),
('esgotos','coletor_esgoto','Coletor de esgoto','m','Esgotos','Coletor de esgoto'),
-- AVAC
('avac','unidade_interior','Unidade interior','un','AVAC','Unidade interior AVAC'),
('avac','unidade_exterior','Unidade exterior','un','AVAC','Unidade exterior AVAC'),
('avac','grelha_insuflacao','Grelha de insuflação','un','AVAC','Grelha de insuflação'),
('avac','grelha_retorno','Grelha de retorno','un','AVAC','Grelha de retorno'),
('avac','difusor','Difusor','un','AVAC','Difusor'),
('avac','conduta','Conduta','m','AVAC','Conduta de ar'),
('avac','exaustor','Exaustor','un','AVAC','Exaustor'),
('avac','recuperador_calor','Recuperador de calor','un','AVAC','Recuperador de calor'),
('avac','termostato','Termostato','un','AVAC','Termostato'),
('avac','tubagem_frigorifica','Tubagem frigorífica','m','AVAC','Tubagem frigorífica'),
('avac','dreno_condensados','Dreno de condensados','m','AVAC','Dreno de condensados'),
-- Telecomunicações
('telecomunicacoes','tomada_rj45','Tomada RJ45','un','Telecomunicações','Tomada RJ45'),
('telecomunicacoes','tomada_tv','Tomada TV','un','Telecomunicações','Tomada TV'),
('telecomunicacoes','tomada_fibra','Tomada de fibra','un','Telecomunicações','Tomada de fibra'),
('telecomunicacoes','bastidor','Bastidor','un','Telecomunicações','Bastidor'),
('telecomunicacoes','caixa_ited','Caixa ITED','un','Telecomunicações','Caixa ITED'),
('telecomunicacoes','ponto_rede','Ponto de rede','un','Telecomunicações','Ponto de rede'),
('telecomunicacoes','tubagem_telecomunicacoes','Tubagem telecom','m','Telecomunicações','Tubagem de telecomunicações'),
-- Gás
('gas','ponto_gas','Ponto de gás','un','Gás','Ponto de gás'),
('gas','valvula_gas','Válvula de gás','un','Gás','Válvula de gás'),
('gas','contador_gas','Contador de gás','un','Gás','Contador de gás'),
('gas','tubagem_gas','Tubagem de gás','m','Gás','Tubagem de gás'),
('gas','ventilacao_gas','Ventilação de gás','un','Gás','Ventilação de gás'),
-- Segurança
('seguranca','detetor_incendio','Detetor de incêndio','un','Segurança','Detetor de incêndio'),
('seguranca','botoneira','Botoneira','un','Segurança','Botoneira de alarme'),
('seguranca','sirene','Sirene','un','Segurança','Sirene'),
('seguranca','camara_cctv','Câmara CCTV','un','Segurança','Câmara CCTV'),
('seguranca','sensor_movimento','Sensor de movimento','un','Segurança','Sensor de movimento'),
('seguranca','central_alarme','Central de alarme','un','Segurança','Central de alarme'),
('seguranca','iluminacao_emergencia','Iluminação de emergência','un','Segurança','Iluminação de emergência');
