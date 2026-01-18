-- Corrigir search_path das funções para segurança
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
  SELECT * INTO elem FROM public.constructive_elements WHERE id = p_element_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  params := elem.parameters;
  
  SELECT COALESCE(SUM(width_m * height_m), 0) 
  INTO openings_area 
  FROM public.element_openings WHERE element_id = p_element_id;
  
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
      gross_area := 0; net_area := 0; volume := 0; layer_count := 1; wall_side_count := 1;
  END CASE;
  
  INSERT INTO public.calculated_parameters (element_id, key, value, unit)
  VALUES 
    (p_element_id, 'gross_area_m2', ROUND(gross_area, 3), 'm2'),
    (p_element_id, 'openings_area_m2', ROUND(openings_area, 3), 'm2'),
    (p_element_id, 'net_area_m2', ROUND(net_area, 3), 'm2'),
    (p_element_id, 'volume_m3', ROUND(volume, 4), 'm3'),
    (p_element_id, 'layer_count', layer_count, 'un'),
    (p_element_id, 'wall_side_count', wall_side_count, 'un')
  ON CONFLICT (element_id, key) DO UPDATE SET value = EXCLUDED.value, created_at = now();
    
  UPDATE public.constructive_elements SET updated_at = now() WHERE id = p_element_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION execute_parametric_rule(p_rule_id UUID, p_element_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  rule RECORD;
  base_value NUMERIC;
  layer_count NUMERIC;
  wall_side_count NUMERIC;
  result NUMERIC;
BEGIN
  SELECT * INTO rule FROM public.parametric_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  SELECT value INTO base_value FROM public.calculated_parameters 
  WHERE element_id = p_element_id AND key = rule.base_parameter;
  IF base_value IS NULL THEN RETURN 0; END IF;
  
  SELECT value INTO layer_count FROM public.calculated_parameters 
  WHERE element_id = p_element_id AND key = 'layer_count';
  SELECT value INTO wall_side_count FROM public.calculated_parameters 
  WHERE element_id = p_element_id AND key = 'wall_side_count';
  
  result := base_value * COALESCE(rule.coefficient, 1.0);
  IF rule.formula LIKE '%layer_count%' THEN result := result * COALESCE(layer_count, 1); END IF;
  IF rule.formula LIKE '%wall_side_count%' THEN result := result * COALESCE(wall_side_count, 2); END IF;
  
  RETURN ROUND(result, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION sync_parametric_quantities(p_element_id UUID)
RETURNS VOID AS $$
DECLARE
  artigo RECORD;
  old_qty NUMERIC;
  new_qty NUMERIC;
BEGIN
  FOR artigo IN 
    SELECT * FROM public.artigos_orcamento 
    WHERE linked_element_id = p_element_id AND quantity_source = 'parametric'
  LOOP
    old_qty := artigo.quantidade;
    new_qty := public.execute_parametric_rule(artigo.linked_rule_id, artigo.linked_element_id);
    
    IF new_qty IS NOT NULL AND new_qty != old_qty THEN
      UPDATE public.artigos_orcamento 
      SET quantidade = new_qty, valor_total = new_qty * preco_unitario
      WHERE id = artigo.id;
      
      INSERT INTO public.parametric_audit_logs (user_id, action, element_id, budget_item_id, old_value, new_value)
      VALUES (auth.uid(), 'recalculate', p_element_id, artigo.id, old_qty, new_qty);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION validate_element_parameters(p_element_id UUID)
RETURNS TABLE(level TEXT, message TEXT, field TEXT) AS $$
DECLARE
  elem RECORD;
  params JSONB;
  openings_area NUMERIC;
  gross_area NUMERIC;
BEGIN
  SELECT * INTO elem FROM public.constructive_elements WHERE id = p_element_id;
  IF NOT FOUND THEN RETURN; END IF;
  params := elem.parameters;
  
  IF elem.element_type = 'wall' THEN
    IF COALESCE((params->>'length_m')::NUMERIC, 0) <= 0 THEN
      level := 'error'; message := 'Comprimento deve ser maior que 0'; field := 'length_m'; RETURN NEXT;
    END IF;
    IF COALESCE((params->>'height_m')::NUMERIC, 0) <= 0 THEN
      level := 'error'; message := 'Altura deve ser maior que 0'; field := 'height_m'; RETURN NEXT;
    END IF;
    IF (params->>'height_m')::NUMERIC < 2.4 AND (params->>'height_m')::NUMERIC > 0 THEN
      level := 'warning'; message := 'Altura inferior ao mínimo regulamentar (2.40m)'; field := 'height_m'; RETURN NEXT;
    END IF;
    IF (params->>'height_m')::NUMERIC > 4.0 THEN
      level := 'warning'; message := 'Altura superior a 4.0m - verificar travamentos'; field := 'height_m'; RETURN NEXT;
    END IF;
    IF elem.functional_type = 'structural_wall' AND elem.construction_method IN ('drywall_pladur', 'wood_frame') THEN
      level := 'error'; message := 'Método construtivo não suporta função estrutural'; field := 'construction_method'; RETURN NEXT;
    END IF;
  END IF;
  
  SELECT COALESCE(SUM(width_m * height_m), 0) INTO openings_area FROM public.element_openings WHERE element_id = p_element_id;
  IF elem.element_type = 'wall' THEN
    gross_area := COALESCE((params->>'length_m')::NUMERIC, 0) * COALESCE((params->>'height_m')::NUMERIC, 0);
  ELSE
    gross_area := COALESCE((params->>'length_m')::NUMERIC, 0) * COALESCE((params->>'width_m')::NUMERIC, 0);
  END IF;
  IF openings_area > gross_area AND gross_area > 0 THEN
    level := 'error'; message := 'Área de aberturas excede área bruta'; field := 'openings'; RETURN NEXT;
  END IF;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trigger_recalculate_element()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.calculate_element_parameters(NEW.id);
  PERFORM public.sync_parametric_quantities(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trigger_recalculate_on_opening_change()
RETURNS TRIGGER AS $$
DECLARE elem_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN elem_id := OLD.element_id; ELSE elem_id := NEW.element_id; END IF;
  PERFORM public.calculate_element_parameters(elem_id);
  PERFORM public.sync_parametric_quantities(elem_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;