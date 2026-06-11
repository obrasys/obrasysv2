
ALTER TABLE public.plan_measurements
  ADD COLUMN IF NOT EXISTS tipo_folha_origem text,
  ADD COLUMN IF NOT EXISTS compartimento_origem text;

ALTER TABLE public.plan_additional_items
  ADD COLUMN IF NOT EXISTS tipo_folha_origem text,
  ADD COLUMN IF NOT EXISTS compartimento_origem text;

CREATE INDEX IF NOT EXISTS idx_plan_measurements_estado_q ON public.plan_measurements(estado_quantitativo);
CREATE INDEX IF NOT EXISTS idx_plan_measurements_disciplina ON public.plan_measurements(disciplina_origem);
CREATE INDEX IF NOT EXISTS idx_plan_additional_estado_q ON public.plan_additional_items(estado_quantitativo);
