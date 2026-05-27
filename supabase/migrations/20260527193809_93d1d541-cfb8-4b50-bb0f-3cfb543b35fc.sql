CREATE OR REPLACE FUNCTION public.prevent_locked_closing_sheet_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'locked' THEN
    -- Permitir updates resultantes de FK ON DELETE SET NULL (apagar orçamento/versão de origem)
    IF (NEW.source_budget_id IS DISTINCT FROM OLD.source_budget_id AND NEW.source_budget_id IS NULL)
       OR (NEW.budget_version_id IS DISTINCT FROM OLD.budget_version_id AND NEW.budget_version_id IS NULL) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Folha de Fecho bloqueada: não pode ser alterada.';
  END IF;

  RETURN NEW;
END;
$function$;