
-- ============================================
-- FIX 1: Formula validation for execute_parametric_rule_v2
-- Adds a validation function that blocks SQL keywords in formulas
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_formula(p_formula text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block SQL keywords (case-insensitive)
  IF p_formula ~* '\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC|UNION|INTO|FROM|WHERE|SET|VALUES|TABLE|FUNCTION|TRIGGER|SCHEMA|DATABASE|COPY|PERFORM|RAISE|RETURN)\b' THEN
    RETURN false;
  END IF;
  
  -- Block dangerous characters/patterns
  IF p_formula ~ '[;''\\]' THEN
    RETURN false;
  END IF;
  
  -- Block comments
  IF p_formula ~ '(--|/\*)' THEN
    RETURN false;
  END IF;
  
  -- Only allow: digits, decimal points, arithmetic operators, parentheses, spaces, and known variable names
  -- After all variable substitution, the formula should only contain numbers and operators
  -- But before substitution, we also allow variable names (letters, underscores)
  IF p_formula !~ '^[a-zA-Z0-9_\s\.\+\-\*\/\(\)\,]+$' THEN
    RETURN false;
  END IF;
  
  -- Max length limit
  IF length(p_formula) > 500 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update execute_parametric_rule_v2 to validate formula before execution
CREATE OR REPLACE FUNCTION public.execute_parametric_rule_v2(p_rule_id uuid, p_element_id uuid, p_coefficient_overrides jsonb DEFAULT '{}'::jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- SECURITY: Validate formula before processing
  IF NOT public.validate_formula(rule.formula) THEN
    RAISE NOTICE 'Formula rejected by security validation: %', rule.formula;
    RETURN 0;
  END IF;
  
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
  
  -- SECURITY: Validate the final formula after substitution (should only contain numbers and operators)
  IF formula_text ~* '\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b' THEN
    RAISE NOTICE 'Post-substitution formula rejected: %', formula_text;
    RETURN 0;
  END IF;
  
  BEGIN
    EXECUTE format('SELECT %s', formula_text) INTO result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao executar fórmula: %. Fórmula: %', SQLERRM, formula_text;
    RETURN 0;
  END;
  
  RETURN ROUND(COALESCE(result, 0), 3);
END;
$function$;


-- ============================================
-- FIX 2: Super admins table instead of hardcoded emails
-- ============================================

-- Create the super_admins table
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can read the table (bootstrap via function)
CREATE POLICY "Super admins can view super_admins table"
  ON public.super_admins FOR SELECT
  USING (public.is_super_admin());

-- No INSERT/UPDATE/DELETE via client - managed via migrations or admin edge functions
CREATE POLICY "No direct insert to super_admins"
  ON public.super_admins FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct update to super_admins"
  ON public.super_admins FOR UPDATE
  USING (false);

CREATE POLICY "No direct delete from super_admins"
  ON public.super_admins FOR DELETE
  USING (false);

-- Seed existing super admin emails
-- We need to look up user_ids from auth.users
INSERT INTO public.super_admins (user_id, email)
SELECT id, email FROM auth.users 
WHERE email IN ('obrasys.pt@gmail.com', 'riquebeze@gmail.com', 'contacto@obrasys.pt')
ON CONFLICT (user_id) DO NOTHING;

-- Now update is_super_admin() to query the table instead of hardcoded emails
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  );
END;
$function$;
