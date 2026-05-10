
ALTER TABLE public.plan_pages
  ADD COLUMN IF NOT EXISTS axia_analysis jsonb,
  ADD COLUMN IF NOT EXISTS axia_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS axia_model text,
  ADD COLUMN IF NOT EXISTS axia_risk_level text,
  ADD COLUMN IF NOT EXISTS axia_review_required boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_plan_pages_axia_review
  ON public.plan_pages (axia_review_required)
  WHERE axia_review_required = true;
