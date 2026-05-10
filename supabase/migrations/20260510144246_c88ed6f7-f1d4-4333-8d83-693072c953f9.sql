
ALTER TABLE public.plan_budget_links
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS quantity_origin text,
  ADD COLUMN IF NOT EXISTS validation_status text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_budget_links_dedupe
  ON public.plan_budget_links (orcamento_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_budget_links_source
  ON public.plan_budget_links (source_type, source_id)
  WHERE source_type IS NOT NULL;
