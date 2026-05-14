
CREATE OR REPLACE FUNCTION public.prevent_org_member_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_super_admin()
       AND NOT EXISTS (
         SELECT 1 FROM public.organization_members om
         WHERE om.user_id = auth.uid()
           AND om.organization_id = NEW.organization_id
           AND om.role IN ('admin','owner')
       )
    THEN
      NEW.role := OLD.role;
    END IF;

    IF NEW.user_id = auth.uid() AND NOT public.is_super_admin() THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_org_member_role_escalation_trigger ON public.organization_members;
CREATE TRIGGER prevent_org_member_role_escalation_trigger
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_org_member_role_escalation();

DROP POLICY IF EXISTS "Org members can read plan files" ON storage.objects;
CREATE POLICY "Org members can read plan files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'plan-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.plan_imports pi
      WHERE pi.file_path = name
        AND pi.user_id = ANY (public.get_org_member_ids())
    )
  )
);

CREATE OR REPLACE FUNCTION public.plan_rooms_autofill_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  n TEXT;
  est_area NUMERIC := NULL;
BEGIN
  n := UPPER(COALESCE(NEW.nome, ''));
  IF COALESCE(NEW.area_m2, 0) > 0 THEN RETURN NEW; END IF;
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
  ELSE est_area := 10;
  END IF;
  NEW.area_m2 := est_area;
  NEW.perimetro_m := ROUND((4 * SQRT(est_area))::numeric, 2);
  IF NEW.observacao IS NULL OR POSITION('Área estimada' IN NEW.observacao) = 0 THEN
    NEW.observacao := COALESCE(NEW.observacao || ' | ', '') || 'Área estimada (validar)';
  END IF;
  RETURN NEW;
END;
$function$;
