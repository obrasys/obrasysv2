
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS compensation_type text DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS monthly_salary numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill hourly_rate from default_hourly_cost for existing workers
UPDATE public.workers SET hourly_rate = default_hourly_cost WHERE hourly_rate = 0 AND default_hourly_cost > 0;
