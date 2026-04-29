-- ──────────────────────────────────────────────────────────────
-- Plantas: Pavimentos, Páginas, Escadas, Itens Outros, Confiança
-- ──────────────────────────────────────────────────────────────

-- 1. Pavimentos por obra
CREATE TABLE IF NOT EXISTS public.plan_floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'piso'
    CHECK (type IN ('subsolo','terreo','piso','cobertura','mezanino','outro')),
  order_index int NOT NULL DEFAULT 0,
  default_ceiling_height numeric(6,2) NOT NULL DEFAULT 2.70,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_floors_obra ON public.plan_floors(obra_id);
CREATE INDEX IF NOT EXISTS idx_plan_floors_user ON public.plan_floors(user_id);

ALTER TABLE public.plan_floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plan_floors"
  ON public.plan_floors FOR SELECT TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can create plan_floors"
  ON public.plan_floors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can update plan_floors"
  ON public.plan_floors FOR UPDATE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can delete plan_floors"
  ON public.plan_floors FOR DELETE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE TRIGGER update_plan_floors_updated_at
  BEFORE UPDATE ON public.plan_floors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Páginas de planta
CREATE TABLE IF NOT EXISTS public.plan_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_import_id uuid NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  page_number int NOT NULL DEFAULT 1,
  floor_id uuid REFERENCES public.plan_floors(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_import_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_plan_pages_plan ON public.plan_pages(plan_import_id);
CREATE INDEX IF NOT EXISTS idx_plan_pages_floor ON public.plan_pages(floor_id);

ALTER TABLE public.plan_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plan_pages"
  ON public.plan_pages FOR SELECT TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can create plan_pages"
  ON public.plan_pages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can update plan_pages"
  ON public.plan_pages FOR UPDATE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can delete plan_pages"
  ON public.plan_pages FOR DELETE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE TRIGGER update_plan_pages_updated_at
  BEFORE UPDATE ON public.plan_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Acrescentar page_id / floor_id / confidence / origem em tabelas existentes
ALTER TABLE public.plan_calibrations
  ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.plan_pages(id) ON DELETE CASCADE;

ALTER TABLE public.plan_measurements
  ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.plan_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES public.plan_floors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.plan_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'provavel'
    CHECK (confidence IN ('confirmado','provavel','precisa_validar','informacao_em_falta')),
  ADD COLUMN IF NOT EXISTS measurement_origin text NOT NULL DEFAULT 'manual'
    CHECK (measurement_origin IN ('axia_auto','manual','derivado','outros','simbolo','editado'));

CREATE INDEX IF NOT EXISTS idx_plan_measurements_page ON public.plan_measurements(page_id);
CREATE INDEX IF NOT EXISTS idx_plan_measurements_floor ON public.plan_measurements(floor_id);
CREATE INDEX IF NOT EXISTS idx_plan_measurements_room ON public.plan_measurements(room_id);
CREATE INDEX IF NOT EXISTS idx_plan_measurements_confidence ON public.plan_measurements(confidence);

ALTER TABLE public.plan_rooms
  ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.plan_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES public.plan_floors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'provavel'
    CHECK (confidence IN ('confirmado','provavel','precisa_validar','informacao_em_falta'));

CREATE INDEX IF NOT EXISTS idx_plan_rooms_floor ON public.plan_rooms(floor_id);

-- 4. Escadas estruturadas
CREATE TABLE IF NOT EXISTS public.plan_stairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_import_id uuid NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.plan_pages(id) ON DELETE SET NULL,
  origin_floor_id uuid REFERENCES public.plan_floors(id) ON DELETE SET NULL,
  destination_floor_id uuid REFERENCES public.plan_floors(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  largura_m numeric(6,2) NOT NULL DEFAULT 1.00,
  steps_count int NOT NULL DEFAULT 0,
  risers_count int NOT NULL DEFAULT 0,
  tread_depth_m numeric(6,3) NOT NULL DEFAULT 0.28,
  riser_height_m numeric(6,3) NOT NULL DEFAULT 0.18,
  landings jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_handrail boolean NOT NULL DEFAULT true,
  has_guardrail boolean NOT NULL DEFAULT false,
  handrail_length_m numeric(6,2),
  guardrail_length_m numeric(6,2),
  confidence text NOT NULL DEFAULT 'provavel'
    CHECK (confidence IN ('confirmado','provavel','precisa_validar','informacao_em_falta')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_stairs_plan ON public.plan_stairs(plan_import_id);
CREATE INDEX IF NOT EXISTS idx_plan_stairs_floor ON public.plan_stairs(origin_floor_id);

ALTER TABLE public.plan_stairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plan_stairs"
  ON public.plan_stairs FOR SELECT TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can create plan_stairs"
  ON public.plan_stairs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can update plan_stairs"
  ON public.plan_stairs FOR UPDATE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can delete plan_stairs"
  ON public.plan_stairs FOR DELETE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE TRIGGER update_plan_stairs_updated_at
  BEFORE UPDATE ON public.plan_stairs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Itens "Outros" (complementares à planta)
CREATE TABLE IF NOT EXISTS public.plan_additional_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  floor_id uuid REFERENCES public.plan_floors(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.plan_rooms(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  description text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'un',
  quantity numeric(14,4) NOT NULL DEFAULT 1,
  notes text,
  budget_link_status text NOT NULL DEFAULT 'not_linked'
    CHECK (budget_link_status IN ('not_linked','suggested','linked','ignored')),
  budget_artigo_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_additional_obra ON public.plan_additional_items(obra_id);
CREATE INDEX IF NOT EXISTS idx_plan_additional_floor ON public.plan_additional_items(floor_id);

ALTER TABLE public.plan_additional_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plan_additional_items"
  ON public.plan_additional_items FOR SELECT TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can create plan_additional_items"
  ON public.plan_additional_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can update plan_additional_items"
  ON public.plan_additional_items FOR UPDATE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can delete plan_additional_items"
  ON public.plan_additional_items FOR DELETE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

CREATE TRIGGER update_plan_additional_items_updated_at
  BEFORE UPDATE ON public.plan_additional_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();