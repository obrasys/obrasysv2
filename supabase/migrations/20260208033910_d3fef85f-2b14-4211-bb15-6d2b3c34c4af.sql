-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.generate_orcamento_codigo(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_next_num INTEGER;
  v_codigo TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get the next number for this user and year
  SELECT COALESCE(MAX(
    CASE 
      WHEN codigo ~ ('^ORC-' || v_year || '-[0-9]{4}$') 
      THEN SUBSTRING(codigo FROM 10 FOR 4)::INTEGER 
      ELSE 0 
    END
  ), 0) + 1
  INTO v_next_num
  FROM public.orcamentos
  WHERE user_id = p_user_id
    AND codigo IS NOT NULL
    AND revisao_de IS NULL;
  
  v_codigo := 'ORC-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
  
  RETURN v_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;