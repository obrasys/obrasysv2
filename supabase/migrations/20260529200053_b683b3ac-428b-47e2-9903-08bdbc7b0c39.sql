CREATE OR REPLACE FUNCTION public.mce_recalc_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mce_id uuid;
  v_dry numeric;
  v_sel_total numeric;
  v_sel_id uuid;
BEGIN
  v_mce_id := COALESCE(NEW.mce_id, OLD.mce_id);

  SELECT COALESCE(SUM(dry_budget_total), 0)
  INTO v_dry
  FROM public.mce_items
  WHERE mce_id = v_mce_id
    AND NOT excluded;

  IF TG_TABLE_NAME IN ('mce_items', 'mce_supplier_item_prices') THEN
    UPDATE public.mce_suppliers s
    SET proposal_total = COALESCE((
      SELECT SUM(p.total_price)
      FROM public.mce_supplier_item_prices p
      JOIN public.mce_items i ON i.id = p.mce_item_id
      WHERE p.mce_supplier_id = s.id
        AND NOT i.excluded
    ), 0)
    WHERE s.mce_id = v_mce_id;
  END IF;

  SELECT id, proposal_total
  INTO v_sel_id, v_sel_total
  FROM public.mce_suppliers
  WHERE mce_id = v_mce_id
    AND is_selected = true
  LIMIT 1;

  UPDATE public.mce_maps
  SET dry_budget_total = v_dry,
      selected_supplier_id = v_sel_id,
      selected_supplier_total = COALESCE(v_sel_total, 0),
      awarded_value = COALESCE(v_sel_total, 0),
      gain_loss_value = v_dry - COALESCE(v_sel_total, 0),
      gain_loss_percentage = CASE
        WHEN v_dry > 0 THEN (v_dry - COALESCE(v_sel_total, 0)) / v_dry
        ELSE 0
      END,
      updated_at = now()
  WHERE id = v_mce_id;

  RETURN NULL;
END;
$$;