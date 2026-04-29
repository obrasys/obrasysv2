ALTER TABLE public.plan_measurements
  ADD COLUMN IF NOT EXISTS action_type text
    CHECK (action_type IN ('demolir','construir','barrar','pintar','revestir')),
  ADD COLUMN IF NOT EXISTS segment_length numeric(12,4),
  ADD COLUMN IF NOT EXISTS ceiling_height numeric(12,4),
  ADD COLUMN IF NOT EXISTS wall_area numeric(12,4),
  ADD COLUMN IF NOT EXISTS baseboard_length numeric(12,4),
  ADD COLUMN IF NOT EXISTS wall_thickness_cm numeric(12,4),
  ADD COLUMN IF NOT EXISTS demolition_volume numeric(12,4),
  ADD COLUMN IF NOT EXISTS openings_area numeric(12,4),
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS material_label text,
  ADD COLUMN IF NOT EXISTS budget_link_status text NOT NULL DEFAULT 'not_linked'
    CHECK (budget_link_status IN ('not_linked','suggested','linked','ignored')),
  ADD COLUMN IF NOT EXISTS budget_artigo_id uuid,
  ADD COLUMN IF NOT EXISTS axia_status text NOT NULL DEFAULT 'not_analyzed'
    CHECK (axia_status IN ('not_analyzed','valid','warning','error')),
  ADD COLUMN IF NOT EXISTS axia_notes jsonb;

CREATE INDEX IF NOT EXISTS idx_plan_measurements_action_type ON public.plan_measurements(action_type);
CREATE INDEX IF NOT EXISTS idx_plan_measurements_budget_link ON public.plan_measurements(budget_link_status);
CREATE INDEX IF NOT EXISTS idx_plan_measurements_axia_status ON public.plan_measurements(axia_status);
CREATE INDEX IF NOT EXISTS idx_plan_measurements_budget_artigo ON public.plan_measurements(budget_artigo_id);