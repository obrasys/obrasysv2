-- Auto-populate plan_rooms.area_m2 and perimetro_m from name-based heuristic
-- when the AI/import did not provide measurements. Keeps the "Por Compartimento"
-- view always populated so the user does not need to manually fill m² for every
-- room. Users can still override with precise measurements.

CREATE OR REPLACE FUNCTION public.plan_rooms_autofill_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  n TEXT;
  est_area NUMERIC := NULL;
BEGIN
  n := UPPER(COALESCE(NEW.nome, ''));

  -- Only autofill when missing/zero
  IF COALESCE(NEW.area_m2, 0) > 0 THEN
    RETURN NEW;
  END IF;

  -- Heuristic mapping by keywords (Portuguese)
  IF n ~ 'COZINHA.*SALA|SALA.*COZINHA' THEN est_area := 24;
  ELSIF n ~ 'SALA' THEN est_area := 18;
  ELSIF n ~ 'COZINHA' THEN est_area := 10;
  ELSIF n ~ 'SUITE|SUÍTE' THEN est_area := 14;
  ELSIF n ~ 'QUARTO|ESCRIT(Ó|O)RIO' THEN est_area := 12;
  ELSIF n ~ 'GARAGEM' THEN est_area := 16;
  ELSIF n ~ 'ESTACIONAMENTO' THEN est_area := 14;
  ELSIF n ~ 'CIRCULA(Ç|C)(Ã|A)O|HALL|CORREDOR' THEN est_area := 6;
  ELSIF n ~ 'WC|I\.S\.|INSTALA(Ç|C)(Ã|A)O\s+SANIT|CASA\s+DE\s+BANHO' THEN est_area := 4;
  ELSIF n ~ 'CLOSET|ARRUMOS|DESPENSA|LAVANDARIA|LAV\.' THEN est_area := 4;
  ELSIF n ~ 'T(É|E)CNIC|EQUIPAMENTOS' THEN est_area := 4;
  ELSIF n ~ 'CHURRASQUEIRA' THEN est_area := 12;
  ELSIF n ~ 'TERRA(Ç|C)O|VARANDA' THEN est_area := 12;
  ELSIF n ~ 'JARDIM|EXTERIOR|LOTE' THEN est_area := 15;
  ELSIF n ~ 'ESCADA' THEN est_area := 5;
  ELSE est_area := 10; -- safe default
  END IF;

  NEW.area_m2 := est_area;
  -- Perimeter approximation: 4 * sqrt(area), rounded to 2 decimals
  NEW.perimetro_m := ROUND((4 * SQRT(est_area))::numeric, 2);

  -- Tag observation if not already
  IF NEW.observacao IS NULL OR POSITION('Área estimada' IN NEW.observacao) = 0 THEN
    NEW.observacao := COALESCE(NEW.observacao || ' | ', '') || 'Área estimada (validar)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_rooms_autofill_metrics ON public.plan_rooms;
CREATE TRIGGER trg_plan_rooms_autofill_metrics
  BEFORE INSERT OR UPDATE OF area_m2, nome ON public.plan_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.plan_rooms_autofill_metrics();

-- Backfill existing rows with area_m2 = 0
UPDATE public.plan_rooms
SET area_m2 = 0  -- triggers the BEFORE UPDATE function which fills based on name
WHERE COALESCE(area_m2, 0) = 0;
