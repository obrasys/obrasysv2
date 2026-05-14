ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS unit_rate_m2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_rate_ml numeric NOT NULL DEFAULT 0;

ALTER TABLE public.timesheet_allocations
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS unit_rate_snapshot numeric;

ALTER TABLE public.project_labor_cost_entries
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS unit_rate numeric;