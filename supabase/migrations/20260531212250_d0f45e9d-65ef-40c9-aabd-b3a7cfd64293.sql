
-- 1) Trigger BEFORE UPDATE em closing_sheets: cria obra automaticamente
CREATE OR REPLACE FUNCTION public.auto_create_obra_on_closing_sheet_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obra_id uuid;
  v_titulo text;
  v_cliente_id uuid;
  v_valor numeric;
  v_orc_obra_id uuid;
BEGIN
  IF NEW.status = 'locked' AND NEW.obra_id IS NULL AND NEW.source_budget_id IS NOT NULL THEN
    SELECT titulo, cliente_id, valor_total, obra_id
      INTO v_titulo, v_cliente_id, v_valor, v_orc_obra_id
      FROM public.orcamentos
      WHERE id = NEW.source_budget_id;

    IF v_orc_obra_id IS NOT NULL THEN
      v_obra_id := v_orc_obra_id;
    ELSE
      INSERT INTO public.obras (nome, cliente_id, valor_previsto, status, user_id)
      VALUES (
        COALESCE(v_titulo, 'Nova Obra'),
        v_cliente_id,
        GREATEST(COALESCE(NEW.sale_price, 0), COALESCE(v_valor, 0)),
        'planeamento',
        NEW.user_id
      )
      RETURNING id INTO v_obra_id;
    END IF;

    NEW.obra_id := v_obra_id;

    -- Sincroniza obra_id no orçamento base (mesmo se bloqueado)
    PERFORM set_config('app.skip_base_lock', 'on', true);
    UPDATE public.orcamentos
       SET obra_id = v_obra_id
     WHERE id = NEW.source_budget_id
       AND obra_id IS NULL;
    PERFORM set_config('app.skip_base_lock', 'off', true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_obra_on_closing_sheet_lock ON public.closing_sheets;
CREATE TRIGGER trg_auto_create_obra_on_closing_sheet_lock
BEFORE UPDATE ON public.closing_sheets
FOR EACH ROW
WHEN (NEW.status = 'locked' AND NEW.obra_id IS NULL)
EXECUTE FUNCTION public.auto_create_obra_on_closing_sheet_lock();

-- 2) Permitir setar obra_id (NULL -> valor) em folhas locked, para backfill seguro
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
    IF (NEW.source_budget_id IS DISTINCT FROM OLD.source_budget_id AND NEW.source_budget_id IS NULL)
       OR (NEW.budget_version_id IS DISTINCT FROM OLD.budget_version_id AND NEW.budget_version_id IS NULL) THEN
      RETURN NEW;
    END IF;

    IF OLD.obra_id IS NULL AND NEW.obra_id IS NOT NULL
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.source_budget_id IS NOT DISTINCT FROM OLD.source_budget_id
       AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    IF OLD.closing_type = 'initial'
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
       AND NEW.obra_id IS NOT DISTINCT FROM OLD.obra_id
       AND NEW.source_budget_id IS NOT DISTINCT FROM OLD.source_budget_id
       AND NEW.budget_version_id IS NOT DISTINCT FROM OLD.budget_version_id
       AND NEW.closing_type IS NOT DISTINCT FROM OLD.closing_type
       AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.snapshot IS NOT DISTINCT FROM OLD.snapshot
       AND NEW.approved_by IS NOT DISTINCT FROM OLD.approved_by
       AND NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at
       AND NEW.locked_at IS NOT DISTINCT FROM OLD.locked_at
       AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Folha de Fecho bloqueada: não pode ser alterada.';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Backfill das folhas já bloqueadas sem Obra
DO $$
DECLARE
  r record;
  v_obra_id uuid;
  v_titulo text;
  v_cliente_id uuid;
  v_valor numeric;
  v_orc_obra_id uuid;
BEGIN
  FOR r IN SELECT * FROM public.closing_sheets
            WHERE status='locked' AND obra_id IS NULL AND source_budget_id IS NOT NULL LOOP
    SELECT titulo, cliente_id, valor_total, obra_id
      INTO v_titulo, v_cliente_id, v_valor, v_orc_obra_id
      FROM public.orcamentos WHERE id = r.source_budget_id;

    IF v_orc_obra_id IS NOT NULL THEN
      v_obra_id := v_orc_obra_id;
    ELSE
      INSERT INTO public.obras (nome, cliente_id, valor_previsto, status, user_id)
      VALUES (COALESCE(v_titulo,'Nova Obra'), v_cliente_id,
              GREATEST(COALESCE(r.sale_price,0), COALESCE(v_valor,0)),
              'planeamento', r.user_id)
      RETURNING id INTO v_obra_id;
    END IF;

    UPDATE public.closing_sheets SET obra_id = v_obra_id WHERE id = r.id;

    PERFORM set_config('app.skip_base_lock', 'on', true);
    UPDATE public.orcamentos SET obra_id = v_obra_id
     WHERE id = r.source_budget_id AND obra_id IS NULL;
    PERFORM set_config('app.skip_base_lock', 'off', true);
  END LOOP;
END $$;
