ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS project_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;