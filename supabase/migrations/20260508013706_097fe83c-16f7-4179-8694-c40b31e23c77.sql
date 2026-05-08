ALTER TABLE public.plan_placed_elements
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual';

UPDATE public.plan_placed_elements
  SET origin = 'axia'
  WHERE origin = 'manual' AND note ILIKE 'Folha %';

CREATE INDEX IF NOT EXISTS idx_plan_placed_elements_origin
  ON public.plan_placed_elements (plan_import_id, origin);