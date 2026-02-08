-- Add codigo and revision tracking to orcamentos
ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS revisao_de UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS numero_revisao INTEGER DEFAULT 0;

-- Create function to generate next orcamento code
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orcamentos_codigo ON public.orcamentos(codigo);
CREATE INDEX IF NOT EXISTS idx_orcamentos_revisao_de ON public.orcamentos(revisao_de);