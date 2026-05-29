
-- ============================================================
-- MCE Phase 3 — Integrations (Contracts, Financial, Budget Objetivo)
-- ============================================================

-- 1) mce_contract_links
CREATE TABLE public.mce_contract_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mce_id uuid NOT NULL REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  contract_type text NOT NULL DEFAULT 'simplified' CHECK (contract_type IN ('simplified','external','adjudication')),
  contract_number text,
  supplier_id uuid,
  supplier_name_snapshot text,
  nif text,
  value numeric(15,2) NOT NULL DEFAULT 0,
  signed_at date,
  signed_by_name text,
  file_url text,
  file_name text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_contract_links TO authenticated;
GRANT ALL ON public.mce_contract_links TO service_role;

ALTER TABLE public.mce_contract_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage mce_contract_links"
ON public.mce_contract_links
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_contract_links.mce_id AND m.user_id = ANY (get_org_member_ids())))
WITH CHECK (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_contract_links.mce_id AND m.user_id = ANY (get_org_member_ids())));

CREATE INDEX idx_mce_contract_links_mce ON public.mce_contract_links(mce_id);

CREATE TRIGGER trg_mce_contract_links_updated
BEFORE UPDATE ON public.mce_contract_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) mce_financial_control
CREATE TABLE public.mce_financial_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mce_id uuid NOT NULL UNIQUE REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  awarded_value numeric(15,2) NOT NULL DEFAULT 0,
  executed_value numeric(15,2) NOT NULL DEFAULT 0,
  invoiced_value numeric(15,2) NOT NULL DEFAULT 0,
  paid_value numeric(15,2) NOT NULL DEFAULT 0,
  invoiced_pct numeric(6,2) NOT NULL DEFAULT 0,
  paid_pct numeric(6,2) NOT NULL DEFAULT 0,
  pending_value numeric(15,2) NOT NULL DEFAULT 0,
  last_update_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_financial_control TO authenticated;
GRANT ALL ON public.mce_financial_control TO service_role;

ALTER TABLE public.mce_financial_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage mce_financial_control"
ON public.mce_financial_control
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_financial_control.mce_id AND m.user_id = ANY (get_org_member_ids())))
WITH CHECK (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_financial_control.mce_id AND m.user_id = ANY (get_org_member_ids())));

CREATE TRIGGER trg_mce_financial_control_updated
BEFORE UPDATE ON public.mce_financial_control
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: paid <= invoiced, recompute derived fields
CREATE OR REPLACE FUNCTION public.fn_mce_financial_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.paid_value > NEW.invoiced_value THEN
    RAISE EXCEPTION 'Valor liquidado (%.2f) não pode exceder o faturado (%.2f).', NEW.paid_value, NEW.invoiced_value
      USING ERRCODE = '23514';
  END IF;
  IF NEW.awarded_value > 0 THEN
    NEW.invoiced_pct := ROUND((NEW.invoiced_value / NEW.awarded_value) * 100, 2);
  ELSE
    NEW.invoiced_pct := 0;
  END IF;
  IF NEW.invoiced_value > 0 THEN
    NEW.paid_pct := ROUND((NEW.paid_value / NEW.invoiced_value) * 100, 2);
  ELSE
    NEW.paid_pct := 0;
  END IF;
  NEW.pending_value := GREATEST(NEW.awarded_value - NEW.paid_value, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mce_financial_validate
BEFORE INSERT OR UPDATE ON public.mce_financial_control
FOR EACH ROW EXECUTE FUNCTION public.fn_mce_financial_validate();

-- 3) mce_budget_objetivo_updates (audit trail)
CREATE TABLE public.mce_budget_objetivo_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mce_id uuid NOT NULL REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  budget_version_id uuid,
  previous_value numeric(15,2) NOT NULL DEFAULT 0,
  new_value numeric(15,2) NOT NULL DEFAULT 0,
  deviation_value numeric(15,2) NOT NULL DEFAULT 0,
  deviation_pct numeric(6,2) NOT NULL DEFAULT 0,
  justification text NOT NULL,
  applied_by uuid,
  applied_by_name text,
  applied_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mce_budget_objetivo_updates TO authenticated;
GRANT ALL ON public.mce_budget_objetivo_updates TO service_role;

ALTER TABLE public.mce_budget_objetivo_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view mce_budget_objetivo_updates"
ON public.mce_budget_objetivo_updates
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_budget_objetivo_updates.mce_id AND m.user_id = ANY (get_org_member_ids())));

CREATE POLICY "Org members insert mce_budget_objetivo_updates"
ON public.mce_budget_objetivo_updates
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_budget_objetivo_updates.mce_id AND m.user_id = ANY (get_org_member_ids())));

CREATE INDEX idx_mce_boupd_mce ON public.mce_budget_objetivo_updates(mce_id);

-- 4) RPC: award_mce
CREATE OR REPLACE FUNCTION public.award_mce(
  _mce_id uuid,
  _awarded_value numeric,
  _contract_number text DEFAULT NULL,
  _signed_at date DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_map public.mce_maps;
  v_supplier public.mce_suppliers;
  v_user_id uuid := auth.uid();
  v_org uuid;
BEGIN
  SELECT * INTO v_map FROM public.mce_maps WHERE id = _mce_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'MCE não encontrado'; END IF;

  -- access check (mesmo padrão)
  IF NOT (v_map.user_id = ANY (get_org_member_ids())) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_map.selected_supplier_id IS NULL THEN
    RAISE EXCEPTION 'É necessário marcar o fornecedor selecionado antes de adjudicar';
  END IF;

  SELECT * INTO v_supplier FROM public.mce_suppliers WHERE id = v_map.selected_supplier_id;

  v_org := v_map.organization_id;

  UPDATE public.mce_maps SET
    status = 'adjudicado',
    awarded_value = _awarded_value,
    awarded_at = now(),
    updated_at = now()
  WHERE id = _mce_id;

  -- contract link (simplified)
  INSERT INTO public.mce_contract_links(
    mce_id, organization_id, contract_type, contract_number,
    supplier_id, supplier_name_snapshot, nif, value, signed_at, notes, created_by
  ) VALUES (
    _mce_id, v_org, 'adjudication', _contract_number,
    v_supplier.supplier_id, v_supplier.supplier_name_snapshot, v_supplier.nif,
    _awarded_value, COALESCE(_signed_at, CURRENT_DATE), _notes, v_user_id
  );

  -- financial control
  INSERT INTO public.mce_financial_control(mce_id, organization_id, awarded_value, pending_value)
  VALUES (_mce_id, v_org, _awarded_value, _awarded_value)
  ON CONFLICT (mce_id) DO UPDATE SET
    awarded_value = EXCLUDED.awarded_value,
    pending_value = GREATEST(EXCLUDED.awarded_value - public.mce_financial_control.paid_value, 0),
    updated_at = now();

  -- financeiro_obras: incrementar valor_contrato
  INSERT INTO public.financeiro_obras(obra_id, valor_contrato)
  VALUES (v_map.obra_id, _awarded_value)
  ON CONFLICT (obra_id) DO UPDATE
    SET valor_contrato = public.financeiro_obras.valor_contrato + _awarded_value,
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'mce_id', _mce_id, 'awarded_value', _awarded_value);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_mce(uuid, numeric, text, date, text) TO authenticated;

-- 5) RPC: apply_mce_to_budget_objetivo
CREATE OR REPLACE FUNCTION public.apply_mce_to_budget_objetivo(
  _mce_id uuid,
  _new_value numeric,
  _justification text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_map public.mce_maps;
  v_user_id uuid := auth.uid();
  v_prev numeric;
  v_dev numeric;
  v_pct numeric;
BEGIN
  IF _justification IS NULL OR length(trim(_justification)) < 5 THEN
    RAISE EXCEPTION 'Justificação obrigatória (mín. 5 caracteres)';
  END IF;

  SELECT * INTO v_map FROM public.mce_maps WHERE id = _mce_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'MCE não encontrado'; END IF;
  IF NOT (v_map.user_id = ANY (get_org_member_ids())) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_prev := COALESCE(v_map.dry_budget_total, 0);
  v_dev := _new_value - v_prev;
  v_pct := CASE WHEN v_prev > 0 THEN ROUND((v_dev / v_prev) * 100, 2) ELSE 0 END;

  INSERT INTO public.mce_budget_objetivo_updates(
    mce_id, organization_id, budget_version_id,
    previous_value, new_value, deviation_value, deviation_pct,
    justification, applied_by, applied_by_name
  ) VALUES (
    _mce_id, v_map.organization_id, v_map.budget_version_id,
    v_prev, _new_value, v_dev, v_pct,
    _justification, v_user_id, (SELECT full_name FROM public.profiles WHERE id = v_user_id LIMIT 1)
  );

  RETURN jsonb_build_object('ok', true, 'previous', v_prev, 'new', _new_value, 'deviation', v_dev, 'deviation_pct', v_pct);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_mce_to_budget_objetivo(uuid, numeric, text) TO authenticated;
