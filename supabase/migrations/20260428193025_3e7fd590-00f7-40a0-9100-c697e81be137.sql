ALTER TABLE public.plan_imports
  ADD COLUMN IF NOT EXISTS workflow_step text NOT NULL DEFAULT 'calibrate',
  ADD COLUMN IF NOT EXISTS has_analysis boolean NOT NULL DEFAULT false;