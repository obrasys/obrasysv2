ALTER TABLE public.closing_sheets ADD COLUMN IF NOT EXISTS version_label TEXT;
CREATE INDEX IF NOT EXISTS idx_closing_sheets_version_label ON public.closing_sheets(source_budget_id, version_label);