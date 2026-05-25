
-- 1) contracting_packages
CREATE TABLE IF NOT EXISTS public.contracting_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  source_budget_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  budget_version_id uuid REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  chapter_code text,
  chapter_name text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_quote','awarded','cancelled')),
  awarded_supplier_id uuid,
  estimated_total numeric NOT NULL DEFAULT 0,
  awarded_total numeric NOT NULL DEFAULT 0,
  awarded_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpkg_version ON public.contracting_packages(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_cpkg_obra ON public.contracting_packages(obra_id);

ALTER TABLE public.contracting_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view contracting_packages"
  ON public.contracting_packages FOR SELECT
  USING (user_id = ANY (public.get_org_member_ids()));
CREATE POLICY "Org members can insert contracting_packages"
  ON public.contracting_packages FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Org members can update contracting_packages"
  ON public.contracting_packages FOR UPDATE
  USING (user_id = ANY (public.get_org_member_ids()));
CREATE POLICY "Org members can delete contracting_packages"
  ON public.contracting_packages FOR DELETE
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE TRIGGER trg_contracting_packages_updated_at
  BEFORE UPDATE ON public.contracting_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Add version + package refs to budget_awards
ALTER TABLE public.budget_awards
  ADD COLUMN IF NOT EXISTS budget_version_id uuid REFERENCES public.budget_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.contracting_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id uuid;

CREATE INDEX IF NOT EXISTS idx_budget_awards_version ON public.budget_awards(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_budget_awards_package ON public.budget_awards(package_id);

-- 3) FK now possible from items.package_id -> contracting_packages
ALTER TABLE public.budget_version_items
  DROP CONSTRAINT IF EXISTS bvi_package_fk;
ALTER TABLE public.budget_version_items
  ADD CONSTRAINT bvi_package_fk
  FOREIGN KEY (package_id) REFERENCES public.contracting_packages(id) ON DELETE SET NULL;

-- 4) RPC: create_contracting_package
CREATE OR REPLACE FUNCTION public.create_contracting_package(
  _budget_version_id uuid,
  _name text,
  _item_ids uuid[],
  _description text DEFAULT NULL,
  _chapter_code text DEFAULT NULL,
  _chapter_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version public.budget_versions;
  v_pkg_id uuid;
  v_estimated numeric;
BEGIN
  SELECT * INTO v_version FROM public.budget_versions WHERE id = _budget_version_id;
  IF v_version IS NULL THEN RAISE EXCEPTION 'Versão não encontrada'; END IF;
  IF v_version.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT COALESCE(SUM(target_total),0) INTO v_estimated
  FROM public.budget_version_items
  WHERE id = ANY(_item_ids) AND budget_version_id = _budget_version_id;

  INSERT INTO public.contracting_packages (
    user_id, organization_id, obra_id, source_budget_id, budget_version_id,
    name, description, chapter_code, chapter_name, estimated_total
  ) VALUES (
    auth.uid(), v_version.organization_id, v_version.obra_id, v_version.source_budget_id, _budget_version_id,
    _name, _description, _chapter_code, _chapter_name, v_estimated
  ) RETURNING id INTO v_pkg_id;

  UPDATE public.budget_version_items
  SET package_id = v_pkg_id,
      contracting_status = CASE WHEN contracting_status = 'open' THEN 'in_quote' ELSE contracting_status END
  WHERE id = ANY(_item_ids) AND budget_version_id = _budget_version_id;

  PERFORM public.log_budget_event(
    _budget_version_id, 'package_created',
    jsonb_build_object('package_id', v_pkg_id, 'name', _name, 'items', array_length(_item_ids,1), 'estimated_total', v_estimated)
  );

  RETURN v_pkg_id;
END; $$;

-- 5) RPC: confirm_award (adjudica pacote a fornecedor)
CREATE OR REPLACE FUNCTION public.confirm_award(
  _package_id uuid,
  _supplier_id uuid,
  _awarded_total numeric,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg public.contracting_packages;
  v_award_id uuid;
  v_item_count integer;
  v_ratio numeric;
BEGIN
  SELECT * INTO v_pkg FROM public.contracting_packages WHERE id = _package_id;
  IF v_pkg IS NULL THEN RAISE EXCEPTION 'Pacote não encontrado'; END IF;
  IF v_pkg.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF v_pkg.status = 'awarded' THEN
    RAISE EXCEPTION 'Pacote já adjudicado';
  END IF;

  SELECT COUNT(*) INTO v_item_count
  FROM public.budget_version_items WHERE package_id = _package_id;
  IF v_item_count = 0 THEN RAISE EXCEPTION 'Pacote sem itens'; END IF;

  v_ratio := CASE WHEN COALESCE(v_pkg.estimated_total,0) > 0
                  THEN _awarded_total / v_pkg.estimated_total ELSE 1 END;

  -- distribuir valor adjudicado proporcionalmente aos itens
  UPDATE public.budget_version_items
  SET awarded_amount = ROUND(target_total * v_ratio, 2),
      supplier_id = _supplier_id,
      contracting_status = 'awarded'
  WHERE package_id = _package_id;

  UPDATE public.contracting_packages
  SET status = 'awarded',
      awarded_supplier_id = _supplier_id,
      awarded_total = _awarded_total,
      awarded_at = now(),
      notes = COALESCE(_notes, notes)
  WHERE id = _package_id;

  INSERT INTO public.budget_awards (
    user_id, budget_id, obra_id, awarded_by_user_id, awarded_total_amount,
    remaining_amount, notes, budget_version_id, package_id, supplier_id
  ) VALUES (
    auth.uid(), v_pkg.source_budget_id, v_pkg.obra_id, auth.uid(), _awarded_total,
    _awarded_total, _notes, v_pkg.budget_version_id, _package_id, _supplier_id
  ) RETURNING id INTO v_award_id;

  PERFORM public.log_budget_event(
    v_pkg.budget_version_id, 'package_awarded',
    jsonb_build_object(
      'package_id', _package_id, 'supplier_id', _supplier_id,
      'awarded_total', _awarded_total, 'estimated_total', v_pkg.estimated_total,
      'award_id', v_award_id
    )
  );

  RETURN v_award_id;
END; $$;
