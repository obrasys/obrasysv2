
-- 1) obra_purchases
CREATE TABLE IF NOT EXISTS public.obra_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE,
  source_budget_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  budget_version_id uuid REFERENCES public.budget_versions(id) ON DELETE SET NULL,
  budget_version_item_id uuid REFERENCES public.budget_version_items(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.contracting_packages(id) ON DELETE SET NULL,
  supplier_id uuid,
  description text NOT NULL,
  invoice_number text,
  invoice_date date,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered','paid','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obra_purchases_obra ON public.obra_purchases(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_purchases_version ON public.obra_purchases(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_obra_purchases_item ON public.obra_purchases(budget_version_item_id);

ALTER TABLE public.obra_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view obra_purchases"
  ON public.obra_purchases FOR SELECT
  USING (user_id = ANY (public.get_org_member_ids()));
CREATE POLICY "Org members can insert obra_purchases"
  ON public.obra_purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Org members can update obra_purchases"
  ON public.obra_purchases FOR UPDATE
  USING (user_id = ANY (public.get_org_member_ids()));
CREATE POLICY "Org members can delete obra_purchases"
  ON public.obra_purchases FOR DELETE
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE TRIGGER trg_obra_purchases_updated_at
  BEFORE UPDATE ON public.obra_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Trigger: recalcular purchased_amount no item da versão
CREATE OR REPLACE FUNCTION public.recalc_item_purchased_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
  v_total numeric;
BEGIN
  v_item_id := COALESCE(NEW.budget_version_item_id, OLD.budget_version_item_id);
  IF v_item_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(total_amount),0) INTO v_total
  FROM public.obra_purchases
  WHERE budget_version_item_id = v_item_id AND status <> 'cancelled';

  UPDATE public.budget_version_items
  SET purchased_amount = v_total,
      remaining_amount = ROUND(target_total - awarded_amount - v_total, 2),
      contracting_status = CASE
        WHEN v_total >= target_total AND target_total > 0 THEN 'purchased'
        ELSE contracting_status
      END
  WHERE id = v_item_id;

  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_item_purchased ON public.obra_purchases;
CREATE TRIGGER trg_recalc_item_purchased
AFTER INSERT OR UPDATE OR DELETE ON public.obra_purchases
FOR EACH ROW EXECUTE FUNCTION public.recalc_item_purchased_amount();

-- 3) RPC: register_purchase
CREATE OR REPLACE FUNCTION public.register_purchase(
  _obra_id uuid,
  _description text,
  _total_amount numeric,
  _supplier_id uuid DEFAULT NULL,
  _budget_version_item_id uuid DEFAULT NULL,
  _package_id uuid DEFAULT NULL,
  _invoice_number text DEFAULT NULL,
  _invoice_date date DEFAULT NULL,
  _quantity numeric DEFAULT 1,
  _unit_price numeric DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id uuid;
  v_version_id uuid;
  v_budget_id uuid;
  v_org_id uuid;
  v_unit numeric;
BEGIN
  IF _budget_version_item_id IS NOT NULL THEN
    SELECT budget_version_id INTO v_version_id
    FROM public.budget_version_items WHERE id = _budget_version_item_id;
    SELECT source_budget_id, organization_id INTO v_budget_id, v_org_id
    FROM public.budget_versions WHERE id = v_version_id;
  END IF;

  v_unit := COALESCE(_unit_price, CASE WHEN _quantity > 0 THEN _total_amount / _quantity ELSE _total_amount END);

  INSERT INTO public.obra_purchases (
    user_id, organization_id, obra_id, source_budget_id, budget_version_id,
    budget_version_item_id, package_id, supplier_id,
    description, invoice_number, invoice_date,
    quantity, unit_price, total_amount, notes
  ) VALUES (
    auth.uid(), v_org_id, _obra_id, v_budget_id, v_version_id,
    _budget_version_item_id, _package_id, _supplier_id,
    _description, _invoice_number, _invoice_date,
    _quantity, v_unit, _total_amount, _notes
  ) RETURNING id INTO v_purchase_id;

  IF v_version_id IS NOT NULL THEN
    PERFORM public.log_budget_event(
      v_version_id, 'purchase_registered',
      jsonb_build_object(
        'purchase_id', v_purchase_id,
        'item_id', _budget_version_item_id,
        'supplier_id', _supplier_id,
        'total_amount', _total_amount,
        'invoice_number', _invoice_number
      )
    );
  END IF;

  RETURN v_purchase_id;
END; $$;

-- 4) RPC: generate_final_closing_sheet
CREATE OR REPLACE FUNCTION public.generate_final_closing_sheet(
  _orcamento_id uuid,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active public.budget_versions;
  v_base public.budget_versions;
  v_closing_id uuid;
  v_total_base numeric;
  v_total_target numeric;
  v_total_awarded numeric;
  v_total_purchased numeric;
  v_total_remaining numeric;
  v_variance numeric;
  v_orcamento public.orcamentos;
BEGIN
  SELECT * INTO v_orcamento FROM public.orcamentos WHERE id = _orcamento_id;
  IF v_orcamento IS NULL THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_orcamento.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_active FROM public.budget_versions
   WHERE source_budget_id = _orcamento_id AND version_type = 'target' AND status = 'active'
   ORDER BY version_number DESC LIMIT 1;
  IF v_active IS NULL THEN RAISE EXCEPTION 'Sem Budget Objetivo ativo'; END IF;

  SELECT * INTO v_base FROM public.budget_versions
   WHERE source_budget_id = _orcamento_id AND version_type = 'base_dry'
   ORDER BY version_number DESC LIMIT 1;

  SELECT
    COALESCE(SUM(base_total),0),
    COALESCE(SUM(target_total),0),
    COALESCE(SUM(awarded_amount),0),
    COALESCE(SUM(purchased_amount),0),
    COALESCE(SUM(remaining_amount),0)
  INTO v_total_base, v_total_target, v_total_awarded, v_total_purchased, v_total_remaining
  FROM public.budget_version_items WHERE budget_version_id = v_active.id;

  v_variance := v_total_purchased - v_total_base;

  INSERT INTO public.closing_sheets (
    user_id, organization_id, obra_id, source_budget_id, budget_version_id,
    closing_type, status,
    total_direct_cost, sale_price, expected_result, final_result,
    snapshot, approved_by, approved_at, locked_at, notes
  ) VALUES (
    auth.uid(), v_active.organization_id, v_active.obra_id, _orcamento_id, v_active.id,
    'final', 'locked',
    v_total_purchased, v_total_target, v_total_target - v_total_base, v_total_target - v_total_purchased,
    jsonb_build_object(
      'total_base', v_total_base,
      'total_target', v_total_target,
      'total_awarded', v_total_awarded,
      'total_purchased', v_total_purchased,
      'total_remaining', v_total_remaining,
      'variance_from_base', v_variance,
      'base_version_id', v_base.id,
      'active_target_version_id', v_active.id,
      'generated_at', now()
    ),
    auth.uid(), now(), now(), _notes
  ) RETURNING id INTO v_closing_id;

  -- Marcar versão como fechada
  UPDATE public.budget_versions SET status = 'closed' WHERE id = v_active.id;

  PERFORM public.log_budget_event(
    v_active.id, 'final_closing_generated',
    jsonb_build_object(
      'closing_id', v_closing_id,
      'total_base', v_total_base,
      'total_target', v_total_target,
      'total_purchased', v_total_purchased,
      'variance', v_variance
    )
  );

  RETURN v_closing_id;
END; $$;
