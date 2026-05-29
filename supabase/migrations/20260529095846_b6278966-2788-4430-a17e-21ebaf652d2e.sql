
CREATE TYPE public.mce_approval_level AS ENUM ('gestor_obra','direcao_geral','financeiro','administracao');
CREATE TYPE public.mce_approval_decision AS ENUM ('pendente','aprovado','rejeitado','devolvido');

CREATE TABLE public.mce_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mce_id UUID NOT NULL REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  level public.mce_approval_level NOT NULL,
  level_order SMALLINT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  assigned_user_id UUID NULL,
  assigned_role TEXT NULL,
  decision public.mce_approval_decision NOT NULL DEFAULT 'pendente',
  decided_by UUID NULL,
  decided_by_name TEXT NULL,
  decided_at TIMESTAMPTZ NULL,
  validated_amount NUMERIC(14,2) NULL,
  comment TEXT NULL,
  signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mce_id, level)
);

CREATE INDEX idx_mce_approvals_mce ON public.mce_approvals(mce_id);
CREATE INDEX idx_mce_approvals_org ON public.mce_approvals(organization_id);
CREATE INDEX idx_mce_approvals_assigned ON public.mce_approvals(assigned_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_approvals TO authenticated;
GRANT ALL ON public.mce_approvals TO service_role;

ALTER TABLE public.mce_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MCE approvals visible to org members"
ON public.mce_approvals FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "MCE approvals insertable by org members"
ON public.mce_approvals FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "MCE approvals updatable by assigned user or admin"
ON public.mce_approvals FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND (
    assigned_user_id = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_approvals.mce_id AND m.user_id = auth.uid())
  )
);

CREATE POLICY "MCE approvals deletable by org admin"
ON public.mce_approvals FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id() AND public.is_super_admin());

CREATE TRIGGER trg_mce_approvals_updated
BEFORE UPDATE ON public.mce_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_mce_default_approvals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.mce_approvals (mce_id, organization_id, level, level_order, assigned_role) VALUES
    (NEW.id, NEW.organization_id, 'gestor_obra'::mce_approval_level, 1, 'project_manager'),
    (NEW.id, NEW.organization_id, 'direcao_geral'::mce_approval_level, 2, 'general_direction'),
    (NEW.id, NEW.organization_id, 'financeiro'::mce_approval_level, 3, 'financial'),
    (NEW.id, NEW.organization_id, 'administracao'::mce_approval_level, 4, 'administration')
  ON CONFLICT (mce_id, level) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_mce_create_default_approvals
AFTER INSERT ON public.mce_maps
FOR EACH ROW EXECUTE FUNCTION public.create_mce_default_approvals();

INSERT INTO public.mce_approvals (mce_id, organization_id, level, level_order, assigned_role)
SELECT m.id, m.organization_id, lvl.level::mce_approval_level, lvl.ord, lvl.role
FROM public.mce_maps m
CROSS JOIN (VALUES
  ('gestor_obra',1,'project_manager'),
  ('direcao_geral',2,'general_direction'),
  ('financeiro',3,'financial'),
  ('administracao',4,'administration')
) AS lvl(level, ord, role)
ON CONFLICT (mce_id, level) DO NOTHING;

CREATE OR REPLACE FUNCTION public.request_mce_approval(_mce_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mce public.mce_maps;
  v_valid_proposals INT;
  v_selected public.mce_suppliers;
  v_lowest NUMERIC;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_mce FROM public.mce_maps WHERE id = _mce_id;
  IF v_mce.id IS NULL THEN RAISE EXCEPTION 'MCE não encontrado'; END IF;
  IF v_mce.organization_id <> public.get_user_org_id() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT COUNT(*) INTO v_valid_proposals FROM public.mce_suppliers
  WHERE mce_id = _mce_id AND proposal_status IN ('validada','selecionada','recebida');
  IF v_valid_proposals < 1 THEN
    v_errors := array_append(v_errors, 'Necessária pelo menos 1 proposta válida');
  END IF;

  IF v_mce.selected_supplier_id IS NULL THEN
    v_errors := array_append(v_errors, 'É necessário selecionar um fornecedor');
  ELSE
    SELECT * INTO v_selected FROM public.mce_suppliers WHERE id = v_mce.selected_supplier_id;
    IF v_selected.nif IS NULL OR length(trim(v_selected.nif)) = 0 THEN
      v_errors := array_append(v_errors, 'Fornecedor selecionado sem NIF');
    END IF;
    SELECT MIN(proposal_total) INTO v_lowest FROM public.mce_suppliers
    WHERE mce_id = _mce_id AND proposal_status IN ('validada','selecionada','recebida') AND proposal_total > 0;
    IF v_lowest IS NOT NULL AND v_selected.proposal_total > v_lowest
       AND (v_selected.selection_reason IS NULL OR length(trim(v_selected.selection_reason)) < 5) THEN
      v_errors := array_append(v_errors, 'Justificação obrigatória — fornecedor selecionado não é o mais barato');
    END IF;
  END IF;

  IF array_length(v_errors,1) IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', to_jsonb(v_errors));
  END IF;

  UPDATE public.mce_maps SET status = 'em_aprovacao', updated_at = now() WHERE id = _mce_id;
  UPDATE public.mce_approvals SET decision = 'pendente', decided_by = NULL, decided_at = NULL, comment = NULL WHERE mce_id = _mce_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.decide_mce_approval(
  _approval_id UUID,
  _decision public.mce_approval_decision,
  _comment TEXT DEFAULT NULL,
  _validated_amount NUMERIC DEFAULT NULL,
  _signature TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_approval public.mce_approvals;
  v_pending_count INT;
  v_rejected_count INT;
  v_user_name TEXT;
BEGIN
  SELECT * INTO v_approval FROM public.mce_approvals WHERE id = _approval_id;
  IF v_approval.id IS NULL THEN RAISE EXCEPTION 'Aprovação não encontrada'; END IF;
  IF v_approval.organization_id <> public.get_user_org_id() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mce_approvals
    WHERE mce_id = v_approval.mce_id AND level_order < v_approval.level_order
      AND required = true AND decision <> 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Níveis anteriores precisam de ser aprovados primeiro';
  END IF;

  SELECT COALESCE(NULLIF(raw_user_meta_data->>'full_name',''), email)
  INTO v_user_name FROM auth.users WHERE id = auth.uid();

  UPDATE public.mce_approvals
  SET decision = _decision, decided_by = auth.uid(), decided_by_name = v_user_name,
      decided_at = now(), comment = _comment, validated_amount = _validated_amount,
      signature = _signature, updated_at = now()
  WHERE id = _approval_id;

  SELECT COUNT(*) INTO v_pending_count FROM public.mce_approvals
  WHERE mce_id = v_approval.mce_id AND required = true AND decision = 'pendente';
  SELECT COUNT(*) INTO v_rejected_count FROM public.mce_approvals
  WHERE mce_id = v_approval.mce_id AND required = true AND decision IN ('rejeitado','devolvido');

  IF v_rejected_count > 0 THEN
    UPDATE public.mce_maps SET status = 'em_analise', updated_at = now() WHERE id = v_approval.mce_id;
  ELSIF v_pending_count = 0 THEN
    UPDATE public.mce_maps SET status = 'aprovado', approved_at = now(), updated_at = now() WHERE id = v_approval.mce_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;
