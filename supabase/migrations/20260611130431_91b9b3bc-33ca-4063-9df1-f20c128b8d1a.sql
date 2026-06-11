
ALTER TABLE public.plan_pages
  ADD COLUMN IF NOT EXISTS sheet_title text,
  ADD COLUMN IF NOT EXISTS drawing_code text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS sheet_type text,
  ADD COLUMN IF NOT EXISTS detected_floor text,
  ADD COLUMN IF NOT EXISTS should_extract_quantities boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_for_validation_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS classification_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS classified_by text,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz;

ALTER TABLE public.plan_measurements
  ADD COLUMN IF NOT EXISTS piso_origem text,
  ADD COLUMN IF NOT EXISTS folha_origem text,
  ADD COLUMN IF NOT EXISTS pagina_origem integer,
  ADD COLUMN IF NOT EXISTS disciplina_origem text,
  ADD COLUMN IF NOT EXISTS metodo_calculo text,
  ADD COLUMN IF NOT EXISTS estado_quantitativo text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2),
  ADD COLUMN IF NOT EXISTS requer_validacao_tecnica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.plan_placed_elements
  ADD COLUMN IF NOT EXISTS piso_origem text,
  ADD COLUMN IF NOT EXISTS folha_origem text,
  ADD COLUMN IF NOT EXISTS pagina_origem integer,
  ADD COLUMN IF NOT EXISTS disciplina_origem text,
  ADD COLUMN IF NOT EXISTS metodo_calculo text,
  ADD COLUMN IF NOT EXISTS estado_quantitativo text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2),
  ADD COLUMN IF NOT EXISTS requer_validacao_tecnica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.plan_additional_items
  ADD COLUMN IF NOT EXISTS piso_origem text,
  ADD COLUMN IF NOT EXISTS folha_origem text,
  ADD COLUMN IF NOT EXISTS pagina_origem integer,
  ADD COLUMN IF NOT EXISTS disciplina_origem text,
  ADD COLUMN IF NOT EXISTS metodo_calculo text,
  ADD COLUMN IF NOT EXISTS estado_quantitativo text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2),
  ADD COLUMN IF NOT EXISTS requer_validacao_tecnica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE TABLE IF NOT EXISTS public.plan_foundation_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_import_id uuid NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  user_id uuid NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  generated_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_foundation_suggestions TO authenticated;
GRANT ALL ON public.plan_foundation_suggestions TO service_role;

ALTER TABLE public.plan_foundation_suggestions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.plan_foundation_suggestions_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_foundation_suggestions_touch ON public.plan_foundation_suggestions;
CREATE TRIGGER trg_plan_foundation_suggestions_touch
BEFORE UPDATE ON public.plan_foundation_suggestions
FOR EACH ROW EXECUTE FUNCTION public.plan_foundation_suggestions_touch();

CREATE POLICY "plan_foundation_suggestions_select"
ON public.plan_foundation_suggestions
FOR SELECT TO authenticated
USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "plan_foundation_suggestions_insert"
ON public.plan_foundation_suggestions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plan_foundation_suggestions_update"
ON public.plan_foundation_suggestions
FOR UPDATE TO authenticated
USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "plan_foundation_suggestions_delete"
ON public.plan_foundation_suggestions
FOR DELETE TO authenticated
USING (user_id = ANY (public.get_org_member_ids()));

CREATE INDEX IF NOT EXISTS idx_plan_foundation_suggestions_plan ON public.plan_foundation_suggestions(plan_import_id);
CREATE INDEX IF NOT EXISTS idx_plan_foundation_suggestions_obra ON public.plan_foundation_suggestions(obra_id);
