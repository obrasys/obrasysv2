-- =====================================================
-- FASE 1: Extensão da tabela parametric_rules
-- =====================================================

-- Adicionar novos campos para suportar o modelo completo PT/ES
ALTER TABLE parametric_rules
ADD COLUMN IF NOT EXISTS rule_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS market TEXT[] DEFAULT '{PT,ES}',
ADD COLUMN IF NOT EXISTS trade TEXT,
ADD COLUMN IF NOT EXISTS defaults JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS output_unit TEXT;

-- =====================================================
-- FASE 2: Tabela de coeficientes por empresa/obra
-- =====================================================

CREATE TABLE IF NOT EXISTS company_parametric_coefficients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  coefficient_key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, orcamento_id, coefficient_key)
);

-- RLS para coeficientes
ALTER TABLE company_parametric_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coefficients"
ON company_parametric_coefficients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coefficients"
ON company_parametric_coefficients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coefficients"
ON company_parametric_coefficients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coefficients"
ON company_parametric_coefficients FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- FASE 3: Atualizar função calculate_element_parameters
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_element_parameters(p_element_id UUID)
RETURNS void AS $$
DECLARE
  elem RECORD;
  params JSONB;
  v_length NUMERIC;
  v_height NUMERIC;
  v_width NUMERIC;
  v_thickness NUMERIC;
  v_slope_factor NUMERIC;
  v_gross_area NUMERIC;
  v_openings_area NUMERIC := 0;
  v_net_area NUMERIC;
  v_volume NUMERIC;
  v_layer_count NUMERIC;
  v_wall_side_count NUMERIC;
BEGIN
  SELECT * INTO elem FROM constructive_elements WHERE id = p_element_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  params := elem.parameters;
  
  v_length := COALESCE((params->>'length_m')::NUMERIC, 0);
  v_height := COALESCE((params->>'height_m')::NUMERIC, 0);
  v_width := COALESCE((params->>'width_m')::NUMERIC, 0);
  v_thickness := COALESCE((params->>'thickness_cm')::NUMERIC, 0);
  v_slope_factor := COALESCE((params->>'slope_factor')::NUMERIC, 1);
  v_layer_count := COALESCE((params->>'layer_count')::NUMERIC, 1);
  v_wall_side_count := COALESCE((params->>'wall_side_count')::NUMERIC, 2);
  
  IF elem.element_type = 'wall' THEN
    v_gross_area := v_length * v_height;
  ELSIF elem.element_type IN ('floor', 'slab', 'ceiling') THEN
    v_gross_area := v_length * v_width;
  ELSIF elem.element_type = 'roof' THEN
    v_gross_area := v_length * v_width * v_slope_factor;
  ELSE
    v_gross_area := v_length * COALESCE(v_height, v_width);
  END IF;
  
  SELECT COALESCE(SUM(width_m * height_m), 0) INTO v_openings_area
  FROM element_openings WHERE element_id = p_element_id;
  
  v_net_area := GREATEST(v_gross_area - v_openings_area, 0);
  v_volume := v_net_area * (v_thickness / 100);
  
  DELETE FROM calculated_parameters WHERE element_id = p_element_id;
  
  INSERT INTO calculated_parameters (element_id, key, value, unit) VALUES
    (p_element_id, 'length_m', v_length, 'm'),
    (p_element_id, 'height_m', v_height, 'm'),
    (p_element_id, 'width_m', v_width, 'm'),
    (p_element_id, 'thickness_cm', v_thickness, 'cm'),
    (p_element_id, 'thickness_m', v_thickness / 100, 'm'),
    (p_element_id, 'gross_area_m2', ROUND(v_gross_area, 3), 'm²'),
    (p_element_id, 'openings_area_m2', ROUND(v_openings_area, 3), 'm²'),
    (p_element_id, 'net_area_m2', ROUND(v_net_area, 3), 'm²'),
    (p_element_id, 'volume_m3', ROUND(v_volume, 4), 'm³'),
    (p_element_id, 'layer_count', v_layer_count, 'un'),
    (p_element_id, 'wall_side_count', v_wall_side_count, 'un');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FASE 4: Nova função execute_parametric_rule_v2
-- =====================================================

CREATE OR REPLACE FUNCTION execute_parametric_rule_v2(
  p_rule_id UUID, 
  p_element_id UUID,
  p_coefficient_overrides JSONB DEFAULT '{}'
)
RETURNS NUMERIC AS $$
DECLARE
  rule RECORD;
  elem RECORD;
  params JSONB;
  calc_params JSONB;
  defaults_json JSONB;
  final_coeffs JSONB;
  formula_text TEXT;
  result NUMERIC;
  
  v_length_m NUMERIC;
  v_height_m NUMERIC;
  v_width_m NUMERIC;
  v_thickness_cm NUMERIC;
  v_thickness_m NUMERIC;
  v_gross_area_m2 NUMERIC;
  v_openings_area_m2 NUMERIC;
  v_net_area_m2 NUMERIC;
  v_volume_m3 NUMERIC;
  v_layer_count NUMERIC;
  v_wall_side_count NUMERIC;
  
  v_loss_factor NUMERIC;
  v_stud_spacing_m NUMERIC;
  v_screw_per_m2 NUMERIC;
  v_paint_coverage_m2_per_l_per_coat NUMERIC;
  v_coats NUMERIC;
  v_mortar_m3_per_m2 NUMERIC;
  v_render_kg_per_m2_per_cm NUMERIC;
  v_render_thickness_cm NUMERIC;
BEGIN
  SELECT * INTO rule FROM parametric_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  SELECT * INTO elem FROM constructive_elements WHERE id = p_element_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  params := elem.parameters;
  
  SELECT jsonb_object_agg(key, value) INTO calc_params
  FROM calculated_parameters WHERE element_id = p_element_id;
  
  IF calc_params IS NULL THEN
    PERFORM calculate_element_parameters(p_element_id);
    SELECT jsonb_object_agg(key, value) INTO calc_params
    FROM calculated_parameters WHERE element_id = p_element_id;
  END IF;
  
  v_length_m := COALESCE((params->>'length_m')::NUMERIC, (calc_params->>'length_m')::NUMERIC, 0);
  v_height_m := COALESCE((params->>'height_m')::NUMERIC, (calc_params->>'height_m')::NUMERIC, 0);
  v_width_m := COALESCE((params->>'width_m')::NUMERIC, (calc_params->>'width_m')::NUMERIC, 0);
  v_thickness_cm := COALESCE((params->>'thickness_cm')::NUMERIC, (calc_params->>'thickness_cm')::NUMERIC, 0);
  v_thickness_m := v_thickness_cm / 100;
  
  v_gross_area_m2 := COALESCE((calc_params->>'gross_area_m2')::NUMERIC, 0);
  v_openings_area_m2 := COALESCE((calc_params->>'openings_area_m2')::NUMERIC, 0);
  v_net_area_m2 := COALESCE((calc_params->>'net_area_m2')::NUMERIC, 0);
  v_volume_m3 := COALESCE((calc_params->>'volume_m3')::NUMERIC, 0);
  v_layer_count := COALESCE((calc_params->>'layer_count')::NUMERIC, (params->>'layer_count')::NUMERIC, 1);
  v_wall_side_count := COALESCE((calc_params->>'wall_side_count')::NUMERIC, (params->>'wall_side_count')::NUMERIC, 2);
  
  defaults_json := COALESCE(rule.defaults, '{}'::JSONB);
  final_coeffs := defaults_json || p_coefficient_overrides;
  
  v_loss_factor := COALESCE((final_coeffs->>'loss_factor')::NUMERIC, 1.0);
  v_stud_spacing_m := COALESCE((final_coeffs->>'stud_spacing_m')::NUMERIC, 0.6);
  v_screw_per_m2 := COALESCE((final_coeffs->>'screw_per_m2')::NUMERIC, 25);
  v_paint_coverage_m2_per_l_per_coat := COALESCE((final_coeffs->>'paint_coverage_m2_per_l_per_coat')::NUMERIC, 10);
  v_coats := COALESCE((final_coeffs->>'coats')::NUMERIC, 2);
  v_mortar_m3_per_m2 := COALESCE((final_coeffs->>'mortar_m3_per_m2')::NUMERIC, 0.015);
  v_render_kg_per_m2_per_cm := COALESCE((final_coeffs->>'render_kg_per_m2_per_cm')::NUMERIC, 18);
  v_render_thickness_cm := COALESCE((final_coeffs->>'render_thickness_cm')::NUMERIC, 1.5);
  
  formula_text := rule.formula;
  
  -- Substituir variáveis na ordem correta (mais longas primeiro para evitar conflitos)
  formula_text := REPLACE(formula_text, 'paint_coverage_m2_per_l_per_coat', v_paint_coverage_m2_per_l_per_coat::TEXT);
  formula_text := REPLACE(formula_text, 'render_kg_per_m2_per_cm', v_render_kg_per_m2_per_cm::TEXT);
  formula_text := REPLACE(formula_text, 'render_thickness_cm', v_render_thickness_cm::TEXT);
  formula_text := REPLACE(formula_text, 'openings_area_m2', v_openings_area_m2::TEXT);
  formula_text := REPLACE(formula_text, 'mortar_m3_per_m2', v_mortar_m3_per_m2::TEXT);
  formula_text := REPLACE(formula_text, 'wall_side_count', v_wall_side_count::TEXT);
  formula_text := REPLACE(formula_text, 'stud_spacing_m', v_stud_spacing_m::TEXT);
  formula_text := REPLACE(formula_text, 'gross_area_m2', v_gross_area_m2::TEXT);
  formula_text := REPLACE(formula_text, 'net_area_m2', v_net_area_m2::TEXT);
  formula_text := REPLACE(formula_text, 'screw_per_m2', v_screw_per_m2::TEXT);
  formula_text := REPLACE(formula_text, 'thickness_cm', v_thickness_cm::TEXT);
  formula_text := REPLACE(formula_text, 'layer_count', v_layer_count::TEXT);
  formula_text := REPLACE(formula_text, 'loss_factor', v_loss_factor::TEXT);
  formula_text := REPLACE(formula_text, 'thickness_m', v_thickness_m::TEXT);
  formula_text := REPLACE(formula_text, 'volume_m3', v_volume_m3::TEXT);
  formula_text := REPLACE(formula_text, 'length_m', v_length_m::TEXT);
  formula_text := REPLACE(formula_text, 'height_m', v_height_m::TEXT);
  formula_text := REPLACE(formula_text, 'width_m', v_width_m::TEXT);
  formula_text := REPLACE(formula_text, 'coats', v_coats::TEXT);
  
  BEGIN
    EXECUTE format('SELECT %s', formula_text) INTO result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao executar fórmula: %. Fórmula: %', SQLERRM, formula_text;
    RETURN 0;
  END;
  
  RETURN ROUND(COALESCE(result, 0), 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FASE 5: Seed Data - Biblioteca Completa PT/ES
-- =====================================================

-- Limpar regras de sistema existentes
DELETE FROM parametric_rules WHERE is_system = true;

-- Inserir biblioteca completa de regras PT/ES
INSERT INTO parametric_rules (rule_key, rule_name, market, element_type, construction_method, functional_type, configuration_type, trade, output_unit, base_parameter, defaults, formula, notes, is_system, locked, unit, coefficient) VALUES

-- ALVENARIA - TIJOLO CERÂMICO
('WALL_MASONRY_BRICK_PT_ES_M2', 'Alvenaria Tijolo Cerâmico', '{PT,ES}', 'wall', 'brick_ceramic', NULL, NULL, 
 'alvenaria_assentamento', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.05}'::JSONB, 
 'net_area_m2 * loss_factor', 
 'Área de alvenaria (assentamento) com perda padrão de 5%.', 
 true, true, 'm²', 1.05),

-- ALVENARIA - BLOCOS DE CIMENTO
('WALL_MASONRY_BLOCK_PT_ES_M2', 'Alvenaria Blocos de Cimento', '{PT,ES}', 'wall', 'concrete_block', NULL, NULL, 
 'alvenaria_blocos_assentamento', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.05}'::JSONB, 
 'net_area_m2 * loss_factor', 
 'Área de alvenaria em blocos com perda padrão de 5%.', 
 true, true, 'm²', 1.05),

-- ALVENARIA - PEDRA NATURAL
('WALL_STONE_MASONRY_M2', 'Alvenaria Pedra Natural', '{PT,ES}', 'wall', 'natural_stone', NULL, NULL, 
 'alvenaria_pedra_assentamento', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.10}'::JSONB, 
 'net_area_m2 * loss_factor', 
 'Pedra tende a ter mais perda/ajustes (10%).', 
 true, true, 'm²', 1.10),

-- ARGAMASSA ASSENTAMENTO - TIJOLO
('WALL_MORTAR_BRICK_M3', 'Argamassa Assentamento Tijolo', '{PT,ES}', 'wall', 'brick_ceramic', NULL, NULL, 
 'argamassa_assentamento', 'm3', 'net_area_m2', 
 '{"mortar_m3_per_m2": 0.015, "loss_factor": 1.10}'::JSONB, 
 'net_area_m2 * mortar_m3_per_m2 * loss_factor', 
 'Coeficiente padrão 0.015 m³/m². Ajustar por tipo de tijolo/junta.', 
 true, true, 'm³', 0.0165),

-- ARGAMASSA ASSENTAMENTO - BLOCOS
('WALL_MORTAR_BLOCK_M3', 'Argamassa Assentamento Blocos', '{PT,ES}', 'wall', 'concrete_block', NULL, NULL, 
 'argamassa_assentamento', 'm3', 'net_area_m2', 
 '{"mortar_m3_per_m2": 0.012, "loss_factor": 1.10}'::JSONB, 
 'net_area_m2 * mortar_m3_per_m2 * loss_factor', 
 'Blocos consomem menos argamassa. Coeficiente 0.012 m³/m².', 
 true, true, 'm³', 0.0132),

-- ARGAMASSA ASSENTAMENTO - PEDRA
('WALL_MORTAR_STONE_M3', 'Argamassa Assentamento Pedra', '{PT,ES}', 'wall', 'natural_stone', NULL, NULL, 
 'argamassa_assentamento', 'm3', 'net_area_m2', 
 '{"mortar_m3_per_m2": 0.025, "loss_factor": 1.15}'::JSONB, 
 'net_area_m2 * mortar_m3_per_m2 * loss_factor', 
 'Pedra irregular consome mais argamassa. Coeficiente 0.025 m³/m².', 
 true, true, 'm³', 0.02875),

-- REBOCO/ESTUQUE - TIJOLO
('WALL_RENDER_BRICK_KG', 'Reboco/Estuque Tijolo', '{PT,ES}', 'wall', 'brick_ceramic', NULL, NULL, 
 'reboco_estuque', 'kg', 'net_area_m2', 
 '{"render_kg_per_m2_per_cm": 18, "render_thickness_cm": 1.5, "loss_factor": 1.10}'::JSONB, 
 'net_area_m2 * render_kg_per_m2_per_cm * render_thickness_cm * loss_factor', 
 'Consumo 18 kg/m²/cm. Espessura padrão 1.5 cm.', 
 true, true, 'kg', 29.7),

-- REBOCO/ESTUQUE - BLOCOS
('WALL_RENDER_BLOCK_KG', 'Reboco/Estuque Blocos', '{PT,ES}', 'wall', 'concrete_block', NULL, NULL, 
 'reboco_estuque', 'kg', 'net_area_m2', 
 '{"render_kg_per_m2_per_cm": 18, "render_thickness_cm": 1.5, "loss_factor": 1.10}'::JSONB, 
 'net_area_m2 * render_kg_per_m2_per_cm * render_thickness_cm * loss_factor', 
 'Consumo 18 kg/m²/cm. Espessura padrão 1.5 cm.', 
 true, true, 'kg', 29.7),

-- REBOCO/ESTUQUE - BETÃO
('WALL_RENDER_CONCRETE_KG', 'Reboco/Estuque Betão', '{PT,ES}', 'wall', 'reinforced_concrete', NULL, NULL, 
 'reboco_estuque', 'kg', 'net_area_m2', 
 '{"render_kg_per_m2_per_cm": 18, "render_thickness_cm": 1.0, "loss_factor": 1.08}'::JSONB, 
 'net_area_m2 * render_kg_per_m2_per_cm * render_thickness_cm * loss_factor', 
 'Betão precisa menos espessura (1 cm). Perda 8%.', 
 true, true, 'kg', 19.44),

-- PINTURA - GENÉRICA
('WALL_PAINT_LITERS', 'Pintura Interior', '{PT,ES}', 'wall', 'brick_ceramic', NULL, NULL, 
 'pintura', 'l', 'net_area_m2', 
 '{"paint_coverage_m2_per_l_per_coat": 10, "coats": 2, "loss_factor": 1.05}'::JSONB, 
 '(net_area_m2 / paint_coverage_m2_per_l_per_coat) * coats * loss_factor', 
 'Cobertura 10 m²/L. 2 demãos padrão. Perda 5%.', 
 true, true, 'l', 0.21),

-- DRYWALL/PLADUR - PLACAS
('WALL_DRYWALL_BOARD_M2', 'Placas Gesso Cartonado', '{PT,ES}', 'wall', 'drywall_pladur', 'partition_wall', NULL, 
 'placas_gesso', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.08}'::JSONB, 
 'net_area_m2 * layer_count * loss_factor', 
 'layer_count define placas por face. Perda 8%.', 
 true, true, 'm²', 2.16),

-- DRYWALL/PLADUR - ESTRUTURA (MONTANTES)
('WALL_DRYWALL_STUDS_LM', 'Perfis Montantes/Guias', '{PT,ES}', 'wall', 'drywall_pladur', 'partition_wall', NULL, 
 'perfis_montantes_guias', 'lm', 'net_area_m2', 
 '{"stud_spacing_m": 0.60, "loss_factor": 1.10}'::JSONB, 
 '((ceil(length_m / stud_spacing_m) + 1) * height_m + (2 * length_m)) * loss_factor', 
 'BIM-like: montantes verticais @60cm + guias sup/inf. Perda 10%.', 
 true, true, 'lm', 1.0),

-- DRYWALL/PLADUR - PARAFUSOS
('WALL_DRYWALL_SCREWS_UN', 'Parafusos Pladur', '{PT,ES}', 'wall', 'drywall_pladur', 'partition_wall', NULL, 
 'parafusos', 'un', 'net_area_m2', 
 '{"screw_per_m2": 25, "loss_factor": 1.10}'::JSONB, 
 'net_area_m2 * screw_per_m2 * layer_count * loss_factor', 
 '25 parafusos/m² por camada. Perda 10%.', 
 true, true, 'un', 55),

-- DRYWALL/PLADUR - ISOLAMENTO
('WALL_DRYWALL_INSULATION_M2', 'Isolamento Pladur', '{PT,ES}', 'wall', 'drywall_pladur', 'partition_wall', 'cavity_wall', 
 'isolamento', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.05}'::JSONB, 
 'net_area_m2 * loss_factor', 
 'Área de isolamento com perda 5%.', 
 true, true, 'm²', 1.05),

-- BETÃO ARMADO - BETÃO
('WALL_RC_CONCRETE_M3', 'Betão Armado', '{PT,ES}', 'wall', 'reinforced_concrete', 'structural_wall', NULL, 
 'betao', 'm3', 'volume_m3', 
 '{"loss_factor": 1.03}'::JSONB, 
 'volume_m3 * loss_factor', 
 'Volume de betão com perda padrão 3%.', 
 true, true, 'm³', 1.03),

-- BETÃO ARMADO - COFRAGEM
('WALL_RC_FORMWORK_M2', 'Cofragem Parede', '{PT,ES}', 'wall', 'reinforced_concrete', 'structural_wall', NULL, 
 'cofragem', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.10}'::JSONB, 
 'net_area_m2 * wall_side_count * loss_factor', 
 'Cofragem nas 2 faces. Perda 10%.', 
 true, true, 'm²', 2.2),

-- WOOD FRAME - PAINÉIS
('WALL_WOOD_FRAME_SHEATHING_M2', 'Painéis Estrutura Madeira', '{PT,ES}', 'wall', 'wood_frame', 'partition_wall', NULL, 
 'painelamento', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.08}'::JSONB, 
 'net_area_m2 * layer_count * loss_factor', 
 'Painéis por face com perda 8%.', 
 true, true, 'm²', 2.16),

-- STEEL FRAME - PAINÉIS
('WALL_STEEL_FRAME_SHEATHING_M2', 'Painéis Estrutura Aço', '{PT,ES}', 'wall', 'steel_frame', 'partition_wall', NULL, 
 'painelamento', 'm2', 'net_area_m2', 
 '{"loss_factor": 1.08}'::JSONB, 
 'net_area_m2 * layer_count * loss_factor', 
 'Painéis por face com perda 8%.', 
 true, true, 'm²', 2.16);

-- Adicionar regras de pintura para outros métodos construtivos
INSERT INTO parametric_rules (rule_key, rule_name, market, element_type, construction_method, functional_type, configuration_type, trade, output_unit, base_parameter, defaults, formula, notes, is_system, locked, unit, coefficient)
SELECT 
  'WALL_PAINT_' || UPPER(construction_method) || '_L',
  'Pintura ' || CASE construction_method 
    WHEN 'concrete_block' THEN 'Blocos'
    WHEN 'natural_stone' THEN 'Pedra'
    WHEN 'reinforced_concrete' THEN 'Betão'
    WHEN 'drywall_pladur' THEN 'Pladur'
    WHEN 'wood_frame' THEN 'Madeira'
    WHEN 'steel_frame' THEN 'Aço'
  END,
  '{PT,ES}', 'wall', construction_method, NULL, NULL,
  'pintura', 'l', 'net_area_m2',
  '{"paint_coverage_m2_per_l_per_coat": 10, "coats": 2, "loss_factor": 1.05}'::JSONB,
  '(net_area_m2 / paint_coverage_m2_per_l_per_coat) * coats * loss_factor',
  'Cobertura 10 m²/L. 2 demãos padrão. Perda 5%.',
  true, true, 'l', 0.21
FROM unnest(ARRAY['concrete_block', 'natural_stone', 'reinforced_concrete', 'drywall_pladur', 'wood_frame', 'steel_frame']) AS construction_method
WHERE NOT EXISTS (
  SELECT 1 FROM parametric_rules WHERE rule_key = 'WALL_PAINT_' || UPPER(construction_method) || '_L'
);