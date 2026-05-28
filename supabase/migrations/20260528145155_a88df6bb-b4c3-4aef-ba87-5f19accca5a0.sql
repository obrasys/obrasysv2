-- Allow plan_imports to be linked to a budget instead of (or in addition to) an obra
ALTER TABLE public.plan_imports
  ALTER COLUMN obra_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS budget_id uuid REFERENCES public.orcamentos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_plan_imports_budget_id ON public.plan_imports(budget_id);

-- Ensure at least one link
ALTER TABLE public.plan_imports
  DROP CONSTRAINT IF EXISTS plan_imports_link_required;
ALTER TABLE public.plan_imports
  ADD CONSTRAINT plan_imports_link_required
  CHECK (obra_id IS NOT NULL OR budget_id IS NOT NULL);

-- Trigger: when a budget is awarded and points to an obra, propagate obra_id
-- to plantas previously created against the budget
CREATE OR REPLACE FUNCTION public.sync_plan_imports_on_budget_award()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.obra_id IS NOT NULL AND NEW.budget_id IS NOT NULL THEN
    UPDATE public.plan_imports
       SET obra_id = NEW.obra_id
     WHERE budget_id = NEW.budget_id
       AND obra_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_plan_imports_on_award ON public.budget_awards;
CREATE TRIGGER trg_sync_plan_imports_on_award
AFTER INSERT OR UPDATE OF obra_id ON public.budget_awards
FOR EACH ROW
EXECUTE FUNCTION public.sync_plan_imports_on_budget_award();