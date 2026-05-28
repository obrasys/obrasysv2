ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_budget_observations TEXT;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS observations_text TEXT;