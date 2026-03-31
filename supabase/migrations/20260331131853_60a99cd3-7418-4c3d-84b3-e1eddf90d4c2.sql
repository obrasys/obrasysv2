-- Drop the existing restrictive foreign key and recreate with ON DELETE SET NULL
ALTER TABLE public.project_schedule_versions
  DROP CONSTRAINT IF EXISTS project_schedule_versions_source_budget_id_fkey;

ALTER TABLE public.project_schedule_versions
  ADD CONSTRAINT project_schedule_versions_source_budget_id_fkey
  FOREIGN KEY (source_budget_id)
  REFERENCES public.orcamentos(id)
  ON DELETE SET NULL;