ALTER TABLE public.plant_files ALTER COLUMN obra_id DROP NOT NULL;
ALTER TABLE public.plant_sheets ALTER COLUMN obra_id DROP NOT NULL;
ALTER TABLE public.plant_elements ALTER COLUMN obra_id DROP NOT NULL;
ALTER TABLE public.plant_budget_exports ALTER COLUMN obra_id DROP NOT NULL;