
-- ============================================================
-- plan_rooms: Compartimentos marcados na planta
-- ============================================================
CREATE TABLE public.plan_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_import_id uuid NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo_compartimento text NOT NULL DEFAULT 'habitacao',
  boundary_coords jsonb NOT NULL DEFAULT '[]'::jsonb,
  area_m2 numeric NOT NULL DEFAULT 0,
  perimetro_m numeric NOT NULL DEFAULT 0,
  pe_direito_m numeric NOT NULL DEFAULT 2.70,
  observacao text,
  estado_validacao text NOT NULL DEFAULT 'pendente',
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_rooms_plan_import_id ON public.plan_rooms(plan_import_id);
CREATE INDEX idx_plan_rooms_user_id ON public.plan_rooms(user_id);

-- ============================================================
-- plan_room_measurements: Ligação N:N rooms <-> measurements
-- ============================================================
CREATE TABLE public.plan_room_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.plan_rooms(id) ON DELETE CASCADE,
  measurement_id uuid NOT NULL REFERENCES public.plan_measurements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, measurement_id)
);

CREATE INDEX idx_plan_room_measurements_room_id ON public.plan_room_measurements(room_id);
CREATE INDEX idx_plan_room_measurements_measurement_id ON public.plan_room_measurements(measurement_id);

-- ============================================================
-- plan_walls: Paredes com tipo funcional e espessura
-- ============================================================
CREATE TABLE public.plan_walls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_import_id uuid NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  room_id uuid REFERENCES public.plan_rooms(id) ON DELETE SET NULL,
  start_point jsonb NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb,
  end_point jsonb NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb,
  comprimento_m numeric NOT NULL DEFAULT 0,
  espessura_cm numeric NOT NULL DEFAULT 15,
  tipo_funcional text NOT NULL DEFAULT 'interior_divisoria',
  material text NOT NULL DEFAULT 'alvenaria',
  observacao text,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_walls_plan_import_id ON public.plan_walls(plan_import_id);
CREATE INDEX idx_plan_walls_user_id ON public.plan_walls(user_id);
CREATE INDEX idx_plan_walls_room_id ON public.plan_walls(room_id);

-- ============================================================
-- plan_openings: Vãos (portas/janelas) associados a paredes
-- ============================================================
CREATE TABLE public.plan_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id uuid NOT NULL REFERENCES public.plan_walls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'porta',
  largura_m numeric NOT NULL DEFAULT 0.80,
  altura_m numeric NOT NULL DEFAULT 2.10,
  peitoril_m numeric,
  posicao_na_parede jsonb,
  observacao text,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_openings_wall_id ON public.plan_openings(wall_id);
CREATE INDEX idx_plan_openings_user_id ON public.plan_openings(user_id);

-- ============================================================
-- RLS for all new tables
-- ============================================================
ALTER TABLE public.plan_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_room_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_walls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_openings ENABLE ROW LEVEL SECURITY;

-- plan_rooms RLS
CREATE POLICY "Users can view org plan_rooms" ON public.plan_rooms
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own plan_rooms" ON public.plan_rooms
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update org plan_rooms" ON public.plan_rooms
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can delete org plan_rooms" ON public.plan_rooms
  FOR DELETE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- plan_room_measurements RLS (based on room ownership)
CREATE POLICY "Users can view org plan_room_measurements" ON public.plan_room_measurements
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_rooms pr
    WHERE pr.id = room_id AND pr.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Users can insert plan_room_measurements" ON public.plan_room_measurements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.plan_rooms pr
    WHERE pr.id = room_id AND pr.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Users can delete plan_room_measurements" ON public.plan_room_measurements
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.plan_rooms pr
    WHERE pr.id = room_id AND pr.user_id = ANY(public.get_org_member_ids())
  ));

-- plan_walls RLS
CREATE POLICY "Users can view org plan_walls" ON public.plan_walls
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own plan_walls" ON public.plan_walls
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update org plan_walls" ON public.plan_walls
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can delete org plan_walls" ON public.plan_walls
  FOR DELETE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- plan_openings RLS
CREATE POLICY "Users can view org plan_openings" ON public.plan_openings
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own plan_openings" ON public.plan_openings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update org plan_openings" ON public.plan_openings
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can delete org plan_openings" ON public.plan_openings
  FOR DELETE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- ============================================================
-- Triggers: updated_at + recalc room area
-- ============================================================
CREATE TRIGGER set_plan_rooms_updated_at
  BEFORE UPDATE ON public.plan_rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_plan_walls_updated_at
  BEFORE UPDATE ON public.plan_walls
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_plan_openings_updated_at
  BEFORE UPDATE ON public.plan_openings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to recalculate room area/perimeter from boundary_coords
CREATE OR REPLACE FUNCTION public.recalc_room_geometry()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  coords jsonb;
  n integer;
  area_px numeric := 0;
  perimeter_px numeric := 0;
  i integer;
  j integer;
  ppm numeric;
BEGIN
  coords := NEW.boundary_coords;
  n := jsonb_array_length(coords);
  
  IF n < 3 THEN
    NEW.area_m2 := 0;
    NEW.perimetro_m := 0;
    RETURN NEW;
  END IF;

  -- Get pixels_per_meter from calibration
  SELECT c.pixels_per_meter INTO ppm
  FROM public.plan_calibrations c
  WHERE c.plan_import_id = NEW.plan_import_id
    AND c.status = 'valida'
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF ppm IS NULL OR ppm <= 0 THEN
    ppm := 1; -- fallback: raw pixels
  END IF;

  -- Shoelace for area
  FOR i IN 0..n-1 LOOP
    j := (i + 1) % n;
    area_px := area_px + (
      (coords->i->>'x')::numeric * (coords->j->>'y')::numeric -
      (coords->j->>'x')::numeric * (coords->i->>'y')::numeric
    );
  END LOOP;
  area_px := abs(area_px) / 2;

  -- Perimeter
  FOR i IN 0..n-1 LOOP
    j := (i + 1) % n;
    perimeter_px := perimeter_px + sqrt(
      power((coords->j->>'x')::numeric - (coords->i->>'x')::numeric, 2) +
      power((coords->j->>'y')::numeric - (coords->i->>'y')::numeric, 2)
    );
  END LOOP;

  NEW.area_m2 := round(area_px / (ppm * ppm), 2);
  NEW.perimetro_m := round(perimeter_px / ppm, 2);

  RETURN NEW;
END;
$$;

CREATE TRIGGER recalc_room_area_on_change
  BEFORE INSERT OR UPDATE OF boundary_coords ON public.plan_rooms
  FOR EACH ROW EXECUTE FUNCTION public.recalc_room_geometry();

-- Trigger to invalidate measurements on recalibration
CREATE OR REPLACE FUNCTION public.invalidate_measurements_on_recalibration()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pixels_per_meter IS DISTINCT FROM OLD.pixels_per_meter THEN
    UPDATE public.plan_measurements
    SET estado_validacao = 'pendente'
    WHERE plan_import_id = NEW.plan_import_id;
    
    -- Also recalculate room geometries
    UPDATE public.plan_rooms
    SET boundary_coords = boundary_coords -- triggers recalc
    WHERE plan_import_id = NEW.plan_import_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invalidate_on_recalibration
  AFTER UPDATE ON public.plan_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_measurements_on_recalibration();
