
ALTER TABLE public.icf_panos_parede
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metodo_medicao text,
  ADD COLUMN IF NOT EXISTS notas_validacao text;

-- Limites coerentes (0..1) sem bloquear NULL para registos pré-existentes
ALTER TABLE public.icf_panos_parede
  DROP CONSTRAINT IF EXISTS icf_panos_parede_confidence_range;
ALTER TABLE public.icf_panos_parede
  ADD CONSTRAINT icf_panos_parede_confidence_range
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
