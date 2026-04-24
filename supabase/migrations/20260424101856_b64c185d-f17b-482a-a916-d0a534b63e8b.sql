-- Tabela para guardar presets de parâmetros financeiros do ICF
CREATE TABLE public.icf_budget_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  margem_lucro numeric NOT NULL DEFAULT 15,
  iva_percent numeric NOT NULL DEFAULT 23,
  custos_indiretos_percent numeric NOT NULL DEFAULT 8,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_budget_presets_user ON public.icf_budget_presets(user_id);

ALTER TABLE public.icf_budget_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own presets"
  ON public.icf_budget_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own presets"
  ON public.icf_budget_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own presets"
  ON public.icf_budget_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own presets"
  ON public.icf_budget_presets FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_icf_budget_presets_updated_at
  BEFORE UPDATE ON public.icf_budget_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();