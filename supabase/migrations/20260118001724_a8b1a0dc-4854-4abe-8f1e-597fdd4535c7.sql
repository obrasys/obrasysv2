-- =====================================================
-- MOTOR PARAMÉTRICO BIM-LIKE - ObraSys
-- Métodos Construtivos Europeus (PT + ES)
-- =====================================================

-- 1. Extensão da tabela artigos_orcamento
ALTER TABLE artigos_orcamento
ADD COLUMN IF NOT EXISTS quantity_source TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS linked_element_id UUID NULL,
ADD COLUMN IF NOT EXISTS linked_rule_id UUID NULL;

-- 2. Tabela de elementos construtivos
CREATE TABLE IF NOT EXISTS constructive_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  element_type TEXT NOT NULL CHECK (element_type IN ('wall', 'floor', 'slab', 'ceiling', 'roof')),
  name TEXT NOT NULL,
  construction_method TEXT NOT NULL CHECK (construction_method IN (
    'brick_ceramic', 'concrete_block', 'natural_stone', 
    'drywall_pladur', 'wood_frame', 'steel_frame', 'reinforced_concrete'
  )),
  functional_type TEXT NOT NULL CHECK (functional_type IN ('partition_wall', 'structural_wall')),
  configuration_type TEXT NOT NULL CHECK (configuration_type IN ('single_layer', 'double_layer', 'cavity_wall')),
  parameters JSONB NOT NULL DEFAULT '{}',
  insulation_type TEXT CHECK (insulation_type IN ('mineral_wool', 'cork', 'eps', 'xps', 'none', NULL)),
  insulation_thickness_cm NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de aberturas (portas, janelas)
CREATE TABLE IF NOT EXISTS element_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id UUID NOT NULL REFERENCES constructive_elements(id) ON DELETE CASCADE,
  opening_type TEXT NOT NULL CHECK (opening_type IN ('door', 'window', 'technical')),
  name TEXT,
  width_m NUMERIC NOT NULL CHECK (width_m > 0),
  height_m NUMERIC NOT NULL CHECK (height_m > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de parâmetros calculados (outputs imutáveis)
CREATE TABLE IF NOT EXISTS calculated_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id UUID NOT NULL REFERENCES constructive_elements(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(element_id, key)
);

-- 5. Tabela de regras paramétricas
CREATE TABLE IF NOT EXISTS parametric_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  element_type TEXT NOT NULL,
  construction_method TEXT NOT NULL,
  functional_type TEXT,
  configuration_type TEXT,
  rule_name TEXT NOT NULL,
  base_parameter TEXT NOT NULL,
  formula TEXT NOT NULL,
  unit TEXT NOT NULL,
  coefficient NUMERIC DEFAULT 1.0,
  is_system BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela de auditoria
CREATE TABLE IF NOT EXISTS parametric_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  element_id UUID,
  budget_item_id UUID,
  old_value NUMERIC,
  new_value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE constructive_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculated_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametric_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametric_audit_logs ENABLE ROW LEVEL SECURITY;

-- Constructive Elements - via orçamento
CREATE POLICY "Users can view their own elements" ON constructive_elements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = constructive_elements.orcamento_id 
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own elements" ON constructive_elements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = constructive_elements.orcamento_id 
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own elements" ON constructive_elements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = constructive_elements.orcamento_id 
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own elements" ON constructive_elements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = constructive_elements.orcamento_id 
      AND o.user_id = auth.uid()
    )
  );

-- Element Openings - via elemento
CREATE POLICY "Users can view openings of their elements" ON element_openings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM constructive_elements ce
      JOIN orcamentos o ON o.id = ce.orcamento_id
      WHERE ce.id = element_openings.element_id 
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert openings in their elements" ON element_openings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM constructive_elements ce
      JOIN orcamentos o ON o.id = ce.orcamento_id
      WHERE ce.id = element_openings.element_id 
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update openings in their elements" ON element_openings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM constructive_elements ce
      JOIN orcamentos o ON o.id = ce.orcamento_id
      WHERE ce.id = element_openings.element_id 
      AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete openings from their elements" ON element_openings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM constructive_elements ce
      JOIN orcamentos o ON o.id = ce.orcamento_id
      WHERE ce.id = element_openings.element_id 
      AND o.user_id = auth.uid()
    )
  );

-- Calculated Parameters - via elemento (read-only para users)
CREATE POLICY "Users can view calculated params of their elements" ON calculated_parameters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM constructive_elements ce
      JOIN orcamentos o ON o.id = ce.orcamento_id
      WHERE ce.id = calculated_parameters.element_id 
      AND o.user_id = auth.uid()
    )
  );

-- Parametric Rules - sistema + user próprio
CREATE POLICY "Users can view system rules and their own" ON parametric_rules
  FOR SELECT USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can insert their own rules" ON parametric_rules
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update their own rules" ON parametric_rules
  FOR UPDATE USING (user_id = auth.uid() AND locked = false);

CREATE POLICY "Users can delete their own rules" ON parametric_rules
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- Audit Logs - user próprio
CREATE POLICY "Users can view their own audit logs" ON parametric_audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Função de cálculo de parâmetros geométricos
CREATE OR REPLACE FUNCTION calculate_element_parameters(p_element_id UUID)
RETURNS VOID AS $$
DECLARE
  elem RECORD;
  params JSONB;
  gross_area NUMERIC;
  openings_area NUMERIC;
  net_area NUMERIC;
  volume NUMERIC;
  layer_count INTEGER;
  wall_side_count INTEGER;
BEGIN
  SELECT * INTO elem FROM constructive_elements WHERE id = p_element_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  params := elem.parameters;
  
  -- Obter área de aberturas
  SELECT COALESCE(SUM(width_m * height_m), 0) 
  INTO openings_area 
  FROM element_openings WHERE element_id = p_element_id;
  
  CASE elem.element_type
    WHEN 'wall' THEN
      gross_area := COALESCE((params->>'length_m')::NUMERIC, 0) * COALESCE((params->>'height_m')::NUMERIC, 0);
      net_area := GREATEST(gross_area - openings_area, 0);
      volume := net_area * (COALESCE((params->>'thickness_cm')::NUMERIC, 0) / 100);
      layer_count := COALESCE((params->>'layer_count')::INTEGER, 1);
      wall_side_count := COALESCE((params->>'wall_side_count')::INTEGER, 2);
      
    WHEN 'floor', 'slab', 'ceiling' THEN
      gross_area := COALESCE((params->>'length_m')::NUMERIC, 0) * COALESCE((params->>'width_m')::NUMERIC, 0);
      net_area := GREATEST(gross_area - openings_area, 0);
      volume := net_area * (COALESCE((params->>'thickness_cm')::NUMERIC, 0) / 100);
      layer_count := 1;
      wall_side_count := 1;
      
    WHEN 'roof' THEN
      gross_area := COALESCE((params->>'length_m')::NUMERIC, 0) * COALESCE((params->>'width_m')::NUMERIC, 0) * 
                    COALESCE((params->>'slope_factor')::NUMERIC, 1.0);
      net_area := gross_area;
      volume := net_area * (COALESCE((params->>'thickness_cm')::NUMERIC, 0) / 100);
      layer_count := 1;
      wall_side_count := 1;
    ELSE
      gross_area := 0;
      net_area := 0;
      volume := 0;
      layer_count := 1;
      wall_side_count := 1;
  END CASE;
  
  -- Persistir resultados (upsert)
  INSERT INTO calculated_parameters (element_id, key, value, unit)
  VALUES 
    (p_element_id, 'gross_area_m2', ROUND(gross_area, 3), 'm2'),
    (p_element_id, 'openings_area_m2', ROUND(openings_area, 3), 'm2'),
    (p_element_id, 'net_area_m2', ROUND(net_area, 3), 'm2'),
    (p_element_id, 'volume_m3', ROUND(volume, 4), 'm3'),
    (p_element_id, 'layer_count', layer_count, 'un'),
    (p_element_id, 'wall_side_count', wall_side_count, 'un')
  ON CONFLICT (element_id, key) DO UPDATE SET 
    value = EXCLUDED.value,
    created_at = now();
    
  -- Atualizar timestamp do elemento
  UPDATE constructive_elements SET updated_at = now() WHERE id = p_element_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de execução de regra paramétrica
CREATE OR REPLACE FUNCTION execute_parametric_rule(p_rule_id UUID, p_element_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  rule RECORD;
  base_value NUMERIC;
  layer_count NUMERIC;
  wall_side_count NUMERIC;
  result NUMERIC;
BEGIN
  SELECT * INTO rule FROM parametric_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Obter valor base
  SELECT value INTO base_value 
  FROM calculated_parameters 
  WHERE element_id = p_element_id AND key = rule.base_parameter;
  
  IF base_value IS NULL THEN RETURN 0; END IF;
  
  -- Obter layer_count e wall_side_count
  SELECT value INTO layer_count 
  FROM calculated_parameters 
  WHERE element_id = p_element_id AND key = 'layer_count';
  
  SELECT value INTO wall_side_count 
  FROM calculated_parameters 
  WHERE element_id = p_element_id AND key = 'wall_side_count';
  
  -- Aplicar fórmula base
  result := base_value * COALESCE(rule.coefficient, 1.0);
  
  -- Multiplicar por layer_count se regra indicar
  IF rule.formula LIKE '%layer_count%' THEN
    result := result * COALESCE(layer_count, 1);
  END IF;
  
  -- Multiplicar por wall_side_count se regra indicar
  IF rule.formula LIKE '%wall_side_count%' THEN
    result := result * COALESCE(wall_side_count, 2);
  END IF;
  
  RETURN ROUND(result, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de sincronização de quantidades paramétricas
CREATE OR REPLACE FUNCTION sync_parametric_quantities(p_element_id UUID)
RETURNS VOID AS $$
DECLARE
  artigo RECORD;
  old_qty NUMERIC;
  new_qty NUMERIC;
BEGIN
  -- Recalcular todos os artigos linkados a este elemento
  FOR artigo IN 
    SELECT * FROM artigos_orcamento 
    WHERE linked_element_id = p_element_id 
      AND quantity_source = 'parametric'
  LOOP
    old_qty := artigo.quantidade;
    new_qty := execute_parametric_rule(artigo.linked_rule_id, artigo.linked_element_id);
    
    IF new_qty IS NOT NULL AND new_qty != old_qty THEN
      UPDATE artigos_orcamento 
      SET quantidade = new_qty,
          valor_total = new_qty * preco_unitario
      WHERE id = artigo.id;
      
      -- Log de auditoria
      INSERT INTO parametric_audit_logs (user_id, action, element_id, budget_item_id, old_value, new_value)
      VALUES (auth.uid(), 'recalculate', p_element_id, artigo.id, old_qty, new_qty);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de validação técnica
CREATE OR REPLACE FUNCTION validate_element_parameters(p_element_id UUID)
RETURNS TABLE(level TEXT, message TEXT, field TEXT) AS $$
DECLARE
  elem RECORD;
  params JSONB;
  openings_area NUMERIC;
  gross_area NUMERIC;
BEGIN
  SELECT * INTO elem FROM constructive_elements WHERE id = p_element_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  params := elem.parameters;
  
  -- Validações para paredes
  IF elem.element_type = 'wall' THEN
    -- Comprimento > 0
    IF COALESCE((params->>'length_m')::NUMERIC, 0) <= 0 THEN
      level := 'error'; message := 'Comprimento deve ser maior que 0'; field := 'length_m';
      RETURN NEXT;
    END IF;
    
    -- Altura > 0
    IF COALESCE((params->>'height_m')::NUMERIC, 0) <= 0 THEN
      level := 'error'; message := 'Altura deve ser maior que 0'; field := 'height_m';
      RETURN NEXT;
    END IF;
    
    -- Altura mínima regulamentar PT
    IF (params->>'height_m')::NUMERIC < 2.4 AND (params->>'height_m')::NUMERIC > 0 THEN
      level := 'warning'; message := 'Altura inferior ao mínimo regulamentar (2.40m)'; field := 'height_m';
      RETURN NEXT;
    END IF;
    
    -- Altura elevada
    IF (params->>'height_m')::NUMERIC > 4.0 THEN
      level := 'warning'; message := 'Altura superior a 4.0m - verificar necessidade de travamentos'; field := 'height_m';
      RETURN NEXT;
    END IF;
    
    -- Parede estrutural com método inválido
    IF elem.functional_type = 'structural_wall' AND 
       elem.construction_method IN ('drywall_pladur', 'wood_frame') THEN
      level := 'error'; 
      message := 'Método construtivo não suporta função estrutural';
      field := 'construction_method';
      RETURN NEXT;
    END IF;
  END IF;
  
  -- Validar área de aberturas
  SELECT COALESCE(SUM(width_m * height_m), 0) INTO openings_area 
  FROM element_openings WHERE element_id = p_element_id;
  
  IF elem.element_type = 'wall' THEN
    gross_area := COALESCE((params->>'length_m')::NUMERIC, 0) * COALESCE((params->>'height_m')::NUMERIC, 0);
  ELSE
    gross_area := COALESCE((params->>'length_m')::NUMERIC, 0) * COALESCE((params->>'width_m')::NUMERIC, 0);
  END IF;
  
  IF openings_area > gross_area AND gross_area > 0 THEN
    level := 'error'; message := 'Área de aberturas excede área bruta do elemento'; field := 'openings';
    RETURN NEXT;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger function para recalcular após alteração de elemento
CREATE OR REPLACE FUNCTION trigger_recalculate_element()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_element_parameters(NEW.id);
  PERFORM sync_parametric_quantities(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function para recalcular após alteração de abertura
CREATE OR REPLACE FUNCTION trigger_recalculate_on_opening_change()
RETURNS TRIGGER AS $$
DECLARE
  elem_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    elem_id := OLD.element_id;
  ELSE
    elem_id := NEW.element_id;
  END IF;
  
  PERFORM calculate_element_parameters(elem_id);
  PERFORM sync_parametric_quantities(elem_id);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers
DROP TRIGGER IF EXISTS trg_recalculate_element ON constructive_elements;
CREATE TRIGGER trg_recalculate_element
AFTER INSERT OR UPDATE ON constructive_elements
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_element();

DROP TRIGGER IF EXISTS trg_recalculate_on_opening ON element_openings;
CREATE TRIGGER trg_recalculate_on_opening
AFTER INSERT OR UPDATE OR DELETE ON element_openings
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_on_opening_change();

-- =====================================================
-- SEED DATA - Regras de Sistema (PT + ES)
-- =====================================================

-- Regras para Alvenaria - Tijolo Cerâmico (PT)
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('wall', 'brick_ceramic', 'Assentamento Tijolo', 'net_area_m2', 'base * coefficient', 'm2', 1.05, true, true),
('wall', 'brick_ceramic', 'Argamassa Assentamento', 'volume_m3', 'base * coefficient', 'm3', 0.025, true, true),
('wall', 'brick_ceramic', 'Reboco Interior', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true),
('wall', 'brick_ceramic', 'Reboco c/ Desperdício', 'net_area_m2', 'base * coefficient', 'm2', 1.10, true, true),
('wall', 'brick_ceramic', 'Pintura Interior', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true);

-- Regras para Blocos de Cimento
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('wall', 'concrete_block', 'Assentamento Blocos', 'net_area_m2', 'base * coefficient', 'm2', 1.05, true, true),
('wall', 'concrete_block', 'Argamassa Assentamento', 'volume_m3', 'base * coefficient', 'm3', 0.03, true, true),
('wall', 'concrete_block', 'Reboco', 'net_area_m2', 'base * coefficient', 'm2', 1.10, true, true);

-- Regras para Gesso Cartonado (Pladur)
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('wall', 'drywall_pladur', 'Placas de Gesso (1 face)', 'net_area_m2', 'base * coefficient', 'm2', 1.05, true, true),
('wall', 'drywall_pladur', 'Placas de Gesso (2 faces)', 'net_area_m2', 'base * layer_count * coefficient', 'm2', 1.05, true, true),
('wall', 'drywall_pladur', 'Estrutura Metálica', 'net_area_m2', 'base * coefficient', 'm', 3.0, true, true),
('wall', 'drywall_pladur', 'Isolamento Lã Mineral', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true),
('wall', 'drywall_pladur', 'Parafusos', 'net_area_m2', 'base * coefficient', 'un', 25, true, true),
('wall', 'drywall_pladur', 'Fita e Betume', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true),
('wall', 'drywall_pladur', 'Pintura', 'net_area_m2', 'base * layer_count * coefficient', 'm2', 1.00, true, true);

-- Regras para Betão Armado
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('wall', 'reinforced_concrete', 'Betão C25/30', 'volume_m3', 'base * coefficient', 'm3', 1.05, true, true),
('wall', 'reinforced_concrete', 'Cofragem (2 faces)', 'net_area_m2', 'base * wall_side_count * coefficient', 'm2', 1.00, true, true),
('wall', 'reinforced_concrete', 'Armadura A500', 'volume_m3', 'base * coefficient', 'kg', 100, true, true),
('wall', 'reinforced_concrete', 'Escoramento', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true);

-- Regras para Wood Frame
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('wall', 'wood_frame', 'Estrutura Madeira', 'net_area_m2', 'base * coefficient', 'm', 2.5, true, true),
('wall', 'wood_frame', 'Painéis OSB', 'net_area_m2', 'base * layer_count * coefficient', 'm2', 1.05, true, true),
('wall', 'wood_frame', 'Isolamento', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true),
('wall', 'wood_frame', 'Barreira Vapor', 'net_area_m2', 'base * coefficient', 'm2', 1.05, true, true);

-- Regras para Steel Frame
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('wall', 'steel_frame', 'Estrutura Aço Galvanizado', 'net_area_m2', 'base * coefficient', 'kg', 8.0, true, true),
('wall', 'steel_frame', 'Painéis', 'net_area_m2', 'base * layer_count * coefficient', 'm2', 1.05, true, true),
('wall', 'steel_frame', 'Isolamento Térmico', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true);

-- Regras para Pedra Natural
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('wall', 'natural_stone', 'Alvenaria Pedra', 'volume_m3', 'base * coefficient', 'm3', 1.10, true, true),
('wall', 'natural_stone', 'Argamassa Cal', 'volume_m3', 'base * coefficient', 'm3', 0.35, true, true);

-- Regras para Pavimentos
INSERT INTO parametric_rules (element_type, construction_method, rule_name, base_parameter, formula, unit, coefficient, is_system, locked) VALUES
('floor', 'reinforced_concrete', 'Betão Laje', 'volume_m3', 'base * coefficient', 'm3', 1.05, true, true),
('floor', 'reinforced_concrete', 'Armadura', 'volume_m3', 'base * coefficient', 'kg', 80, true, true),
('slab', 'reinforced_concrete', 'Betão Laje', 'volume_m3', 'base * coefficient', 'm3', 1.05, true, true),
('slab', 'reinforced_concrete', 'Cofragem Laje', 'net_area_m2', 'base * coefficient', 'm2', 1.00, true, true);