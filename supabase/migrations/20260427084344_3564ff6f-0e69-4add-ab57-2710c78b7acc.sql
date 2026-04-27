CREATE TABLE IF NOT EXISTS public.icf_calculation_constants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  aco_kg_por_m3_paredes NUMERIC NOT NULL DEFAULT 35,
  painel_area_m2 NUMERIC NOT NULL DEFAULT 0.36,
  fator_topos NUMERIC NOT NULL DEFAULT 0.15,
  fator_cantos_c3 NUMERIC NOT NULL DEFAULT 0.20,
  fator_cantos_c4 NUMERIC NOT NULL DEFAULT 0.10,
  espacadores_por_painel NUMERIC NOT NULL DEFAULT 6,
  abobadilhas_por_m2 NUMERIC NOT NULL DEFAULT 0.5,
  trelicas_ml_por_m2 NUMERIC NOT NULL DEFAULT 1.6,
  altura_media_sapata_m NUMERIC NOT NULL DEFAULT 0.45,
  vaos_por_padieira NUMERIC NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.icf_calculation_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ICF constants"
ON public.icf_calculation_constants
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ICF constants"
ON public.icf_calculation_constants
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ICF constants"
ON public.icf_calculation_constants
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own ICF constants"
ON public.icf_calculation_constants
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_icf_constants_updated_at
BEFORE UPDATE ON public.icf_calculation_constants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();