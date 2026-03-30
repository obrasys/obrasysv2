
-- Trigger: when contas_financeiras.pago changes, sync budget_payment_plans and receivables
CREATE OR REPLACE FUNCTION public.sync_payment_status_on_conta_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_label TEXT;
  v_plan_id UUID;
  v_new_status TEXT;
BEGIN
  -- Only act when pago status changes
  IF NEW.pago IS NOT DISTINCT FROM OLD.pago THEN
    RETURN NEW;
  END IF;

  -- Only process contas linked to an obra with tipo 'receber'
  IF NEW.obra_id IS NULL OR NEW.tipo != 'receber' THEN
    RETURN NEW;
  END IF;

  v_new_status := CASE WHEN NEW.pago THEN 'paid' ELSE 'pending' END;

  -- Extract the label (e.g. "Parcela 2") from descricao (format: "Parcela 2 - Titulo")
  v_label := split_part(NEW.descricao, ' - ', 1);

  -- Update matching budget_payment_plan
  UPDATE budget_payment_plans
  SET status = v_new_status, updated_at = now()
  WHERE obra_id = NEW.obra_id
    AND label = v_label
    AND amount = NEW.valor;

  -- Update matching receivable
  UPDATE receivables
  SET 
    status = v_new_status,
    paid_amount = CASE WHEN NEW.pago THEN NEW.valor ELSE 0 END,
    remaining_amount = CASE WHEN NEW.pago THEN 0 ELSE NEW.valor END,
    updated_at = now()
  WHERE obra_id = NEW.obra_id
    AND title LIKE v_label || ' - %'
    AND amount = NEW.valor
    AND source_type = 'budget_award';

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_sync_payment_status ON contas_financeiras;
CREATE TRIGGER trg_sync_payment_status
  AFTER UPDATE OF pago ON contas_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_status_on_conta_update();
