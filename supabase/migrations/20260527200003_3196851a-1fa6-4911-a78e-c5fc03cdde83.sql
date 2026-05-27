CREATE OR REPLACE FUNCTION public.prevent_locked_closing_sheet_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'locked' THEN
    IF (NEW.source_budget_id IS DISTINCT FROM OLD.source_budget_id AND NEW.source_budget_id IS NULL)
       OR (NEW.budget_version_id IS DISTINCT FROM OLD.budget_version_id AND NEW.budget_version_id IS NULL) THEN
      RETURN NEW;
    END IF;

    IF NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
       AND NEW.obra_id IS NOT DISTINCT FROM OLD.obra_id
       AND NEW.source_budget_id IS NOT DISTINCT FROM OLD.source_budget_id
       AND NEW.budget_version_id IS NOT DISTINCT FROM OLD.budget_version_id
       AND NEW.closing_type IS NOT DISTINCT FROM OLD.closing_type
       AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.total_direct_cost IS NOT DISTINCT FROM OLD.total_direct_cost
       AND NEW.total_indirect_cost IS NOT DISTINCT FROM OLD.total_indirect_cost
       AND NEW.structure_costs IS NOT DISTINCT FROM OLD.structure_costs
       AND NEW.contingency_amount IS NOT DISTINCT FROM OLD.contingency_amount
       AND NEW.margin_amount IS NOT DISTINCT FROM OLD.margin_amount
       AND NEW.margin_percent IS NOT DISTINCT FROM OLD.margin_percent
       AND NEW.sale_price IS NOT DISTINCT FROM OLD.sale_price
       AND NEW.expected_result IS NOT DISTINCT FROM OLD.expected_result
       AND NEW.final_result IS NOT DISTINCT FROM OLD.final_result
       AND NEW.snapshot IS NOT DISTINCT FROM OLD.snapshot
       AND NEW.approved_by IS NOT DISTINCT FROM OLD.approved_by
       AND NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at
       AND NEW.locked_at IS NOT DISTINCT FROM OLD.locked_at
       AND NEW.notes IS NOT DISTINCT FROM OLD.notes
       AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
       AND NEW.details IS NOT DISTINCT FROM OLD.details THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Folha de Fecho bloqueada: não pode ser alterada.';
  END IF;

  RETURN NEW;
END;
$$;