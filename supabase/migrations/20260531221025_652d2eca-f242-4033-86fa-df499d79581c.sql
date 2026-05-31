-- 1) Lock só quando a FF é do orçamento Base
CREATE OR REPLACE FUNCTION public.lock_base_orcamento_on_closing_sheet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_base BOOLEAN;
BEGIN
  IF NEW.source_budget_id IS NULL THEN RETURN NEW; END IF;
  SELECT (revisao_de IS NULL) INTO v_is_base FROM public.orcamentos WHERE id = NEW.source_budget_id;
  IF COALESCE(v_is_base, FALSE) THEN
    PERFORM set_config('app.skip_base_lock','on',true);
    UPDATE public.orcamentos
      SET is_base_locked = TRUE, base_locked_at = COALESCE(base_locked_at, NOW())
      WHERE id = NEW.source_budget_id AND is_base_locked = FALSE;
    PERFORM set_config('app.skip_base_lock','off',true);
  END IF;
  RETURN NEW;
END;
$$;

-- 2) FF Base rascunho automática por cada nova versão do Budget
CREATE OR REPLACE FUNCTION public.auto_create_ff_for_budget_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_obra_id UUID;
  v_label TEXT;
  v_exists BOOLEAN;
BEGIN
  IF NEW.budget_version_number IS NULL OR NEW.revisao_de IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.closing_sheets
    WHERE source_budget_id = NEW.id AND closing_type = 'initial'
  ) INTO v_exists;
  IF v_exists THEN RETURN NEW; END IF;

  v_obra_id := NEW.obra_id;
  IF v_obra_id IS NULL THEN
    SELECT obra_id INTO v_obra_id FROM public.orcamentos WHERE id = NEW.revisao_de;
  END IF;

  v_label := 'Budget v' || NEW.budget_version_number;

  INSERT INTO public.closing_sheets (
    user_id, obra_id, source_budget_id,
    closing_type, status, sale_price, version_label, notes
  ) VALUES (
    NEW.user_id, v_obra_id, NEW.id,
    'initial', 'draft', COALESCE(NEW.valor_total, 0), v_label,
    'Gerada automaticamente para ' || v_label
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_ff_for_budget_version ON public.orcamentos;
CREATE TRIGGER trg_auto_create_ff_for_budget_version
  AFTER INSERT ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_ff_for_budget_version();

-- 3) Backfill
INSERT INTO public.closing_sheets (
  user_id, obra_id, source_budget_id,
  closing_type, status, sale_price, version_label, notes
)
SELECT
  v.user_id,
  COALESCE(v.obra_id, b.obra_id),
  v.id,
  'initial', 'draft',
  COALESCE(v.valor_total, 0),
  'Budget v' || v.budget_version_number,
  'Backfill automático'
FROM public.orcamentos v
JOIN public.orcamentos b ON b.id = v.revisao_de
WHERE v.budget_version_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.closing_sheets cs
    WHERE cs.source_budget_id = v.id AND cs.closing_type = 'initial'
  );