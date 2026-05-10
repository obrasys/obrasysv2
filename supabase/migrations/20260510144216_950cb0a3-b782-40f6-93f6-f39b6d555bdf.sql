
ALTER TABLE public.plan_calibrations
  ADD COLUMN IF NOT EXISTS floor_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_calibrations_scope
  ON public.plan_calibrations (
    plan_import_id,
    COALESCE(page_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(floor_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
