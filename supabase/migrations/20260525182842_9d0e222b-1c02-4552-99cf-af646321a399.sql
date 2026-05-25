-- Fase 1: Auditoria económica + recálculo automático de totais

-- 1) Tabela budget_events
CREATE TABLE IF NOT EXISTS public.budget_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  obra_id uuid,
  source_budget_id uuid REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  budget_version_id uuid REFERENCES public.budget_versions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  description text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_events_budget ON public.budget_events(source_budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_events_version ON public.budget_events(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_budget_events_obra ON public.budget_events(obra_id);
CREATE INDEX IF NOT EXISTS idx_budget_events_type ON public.budget_events(event_type);

ALTER TABLE public.budget_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view budget events"
  ON public.budget_events FOR SELECT
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can insert budget events"
  ON public.budget_events FOR INSERT
  WITH CHECK (user_id = ANY (public.get_org_member_ids()));

-- Eventos são imutáveis: sem UPDATE/DELETE policies (excepto super admin via SECURITY DEFINER se necessário)

-- 2) Função utilitária log_budget_event
CREATE OR REPLACE FUNCTION public.log_budget_event(
  p_source_budget_id uuid,
  p_event_type text,
  p_budget_version_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_previous_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_orc record;
  v_id uuid;
BEGIN
  SELECT user_id, obra_id INTO v_orc FROM public.orcamentos WHERE id = p_source_budget_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.budget_events (
    user_id, organization_id, obra_id, source_budget_id, budget_version_id,
    event_type, entity_type, entity_id, previous_value, new_value, description, created_by
  ) VALUES (
    v_orc.user_id, public.get_user_org_id(), v_orc.obra_id, p_source_budget_id, p_budget_version_id,
    p_event_type, p_entity_type, p_entity_id, p_previous_value, p_new_value, p_description,
    COALESCE(v_uid, v_orc.user_id)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 3) Trigger de recálculo de totais em budget_versions
CREATE OR REPLACE FUNCTION public.recalc_budget_version_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_version_id uuid;
  v_base numeric;
  v_target numeric;
  v_awarded numeric;
  v_purchased numeric;
  v_remaining numeric;
  v_base_ref numeric;
BEGIN
  v_version_id := COALESCE(NEW.budget_version_id, OLD.budget_version_id);

  SELECT
    COALESCE(SUM(base_total),0),
    COALESCE(SUM(target_total),0),
    COALESCE(SUM(awarded_amount),0),
    COALESCE(SUM(purchased_amount),0),
    COALESCE(SUM(remaining_amount),0)
  INTO v_base, v_target, v_awarded, v_purchased, v_remaining
  FROM public.budget_version_items
  WHERE budget_version_id = v_version_id;

  -- Para versões target, usar total_base da versão base original como referência
  SELECT total_base INTO v_base_ref
  FROM public.budget_versions bv
  WHERE bv.source_budget_id = (SELECT source_budget_id FROM public.budget_versions WHERE id = v_version_id)
    AND bv.version_type = 'base_dry'
  ORDER BY version_number DESC
  LIMIT 1;

  UPDATE public.budget_versions
  SET total_base = v_base,
      total_target = v_target,
      total_awarded = v_awarded,
      total_purchased = v_purchased,
      total_remaining = v_remaining,
      variance_from_base = v_target - COALESCE(v_base_ref, v_base),
      updated_at = now()
  WHERE id = v_version_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_budget_version_totals ON public.budget_version_items;
CREATE TRIGGER trg_recalc_budget_version_totals
AFTER INSERT OR UPDATE OR DELETE ON public.budget_version_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_budget_version_totals();

-- 4) Trigger updated_at em budget_version_items
DROP TRIGGER IF EXISTS trg_bvi_updated_at ON public.budget_version_items;
CREATE TRIGGER trg_bvi_updated_at
BEFORE UPDATE ON public.budget_version_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Atualizar approve_base_dry_budget para registar eventos
CREATE OR REPLACE FUNCTION public.approve_base_dry_budget(p_orcamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_orc record;
  v_base_version_id uuid;
  v_target_version_id uuid;
  v_closing_id uuid;
  v_ci numeric;
  v_subtotal numeric;
  v_margem numeric;
  v_sale numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_orc FROM public.orcamentos WHERE id = p_orcamento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_orc.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissões';
  END IF;
  IF v_orc.is_locked THEN
    RAISE EXCEPTION 'Orçamento já está bloqueado';
  END IF;

  v_ci := COALESCE((v_orc.custos_indiretos->>'estaleiro')::numeric,0)
        + COALESCE((v_orc.custos_indiretos->>'seguros')::numeric,0)
        + COALESCE((v_orc.custos_indiretos->>'licenciamento')::numeric,0);
  v_subtotal := COALESCE(v_orc.valor_total,0) + v_ci;
  v_margem := COALESCE(v_orc.margem_lucro,0) / 100.0;
  v_sale := CASE WHEN v_margem > 0 AND v_margem < 1 THEN v_subtotal / (1 - v_margem) ELSE v_subtotal END;

  INSERT INTO public.budget_versions (
    user_id, organization_id, obra_id, source_budget_id,
    version_type, version_number, version_name, status,
    total_base, total_target, approved_by, approved_at, locked_at
  ) VALUES (
    v_orc.user_id, public.get_user_org_id(), v_orc.obra_id, v_orc.id,
    'base_dry', 1, 'Base Seco', 'locked',
    v_subtotal, v_subtotal, v_uid, now(), now()
  ) RETURNING id INTO v_base_version_id;

  INSERT INTO public.budget_version_items (
    budget_version_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    remaining_amount, ordem
  )
  SELECT
    v_base_version_id, a.id, c.id,
    c.numero::text, c.titulo, a.codigo, a.descricao, a.unidade,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.valor_total, a.ordem
  FROM public.artigos_orcamento a
  JOIN public.capitulos_orcamento c ON c.id = a.capitulo_id
  WHERE c.orcamento_id = v_orc.id;

  INSERT INTO public.closing_sheets (
    user_id, organization_id, obra_id, source_budget_id, budget_version_id,
    closing_type, status,
    total_direct_cost, total_indirect_cost, site_costs,
    margin_amount, margin_percent, sale_price, expected_result,
    approved_by, approved_at, locked_at,
    snapshot
  ) VALUES (
    v_orc.user_id, public.get_user_org_id(), v_orc.obra_id, v_orc.id, v_base_version_id,
    'initial', 'locked',
    COALESCE(v_orc.valor_total,0), v_ci, COALESCE((v_orc.custos_indiretos->>'estaleiro')::numeric,0),
    v_sale - v_subtotal, COALESCE(v_orc.margem_lucro,0), v_sale, v_sale - v_subtotal,
    v_uid, now(), now(),
    jsonb_build_object('custos_indiretos', v_orc.custos_indiretos, 'valor_total', v_orc.valor_total, 'margem_lucro', v_orc.margem_lucro)
  ) RETURNING id INTO v_closing_id;

  INSERT INTO public.budget_versions (
    user_id, organization_id, obra_id, source_budget_id, parent_version_id,
    version_type, version_number, version_name, status,
    total_base, total_target, total_remaining,
    created_by
  ) VALUES (
    v_orc.user_id, public.get_user_org_id(), v_orc.obra_id, v_orc.id, v_base_version_id,
    'target', 1, 'Budget Objetivo v1', 'active',
    v_subtotal, v_subtotal, v_subtotal,
    v_uid
  ) RETURNING id INTO v_target_version_id;

  INSERT INTO public.budget_version_items (
    budget_version_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    remaining_amount, ordem
  )
  SELECT
    v_target_version_id, a.id, c.id,
    c.numero::text, c.titulo, a.codigo, a.descricao, a.unidade,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.valor_total, a.ordem
  FROM public.artigos_orcamento a
  JOIN public.capitulos_orcamento c ON c.id = a.capitulo_id
  WHERE c.orcamento_id = v_orc.id;

  UPDATE public.orcamentos
  SET status = 'aprovado',
      is_locked = true,
      locked_at = now(),
      locked_reason = 'Aprovado e congelado como Base Seco. Use o Budget Objetivo para alterações.'
  WHERE id = p_orcamento_id;

  -- Eventos
  PERFORM public.log_budget_event(v_orc.id, 'budget_approved', v_base_version_id, 'budget', v_orc.id, NULL, NULL, 'Orçamento Base Seco aprovado e bloqueado');
  PERFORM public.log_budget_event(v_orc.id, 'budget_locked', v_base_version_id, 'budget_version', v_base_version_id, NULL, NULL, 'Versão Base Seco bloqueada');
  PERFORM public.log_budget_event(v_orc.id, 'initial_closing_sheet_created', v_base_version_id, 'closing_sheet', v_closing_id, NULL, NULL, 'Folha de Fecho Inicial gerada');
  PERFORM public.log_budget_event(v_orc.id, 'target_budget_created', v_target_version_id, 'budget_version', v_target_version_id, NULL, NULL, 'Budget Objetivo v1 criado e ativado');

  RETURN jsonb_build_object(
    'base_version_id', v_base_version_id,
    'target_version_id', v_target_version_id,
    'initial_closing_id', v_closing_id
  );
END;
$function$;

-- 6) Atualizar create_new_target_version para registar eventos
CREATE OR REPLACE FUNCTION public.create_new_target_version(p_source_budget_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_active record;
  v_new_id uuid;
  v_next_no integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_active FROM public.budget_versions
  WHERE source_budget_id = p_source_budget_id
    AND version_type = 'target' AND status = 'active'
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem versão ativa para evoluir'; END IF;

  IF v_active.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissões';
  END IF;

  SELECT COALESCE(MAX(version_number),0)+1 INTO v_next_no
  FROM public.budget_versions
  WHERE source_budget_id = p_source_budget_id AND version_type = 'target';

  UPDATE public.budget_versions SET status = 'superseded' WHERE id = v_active.id;

  INSERT INTO public.budget_versions (
    user_id, organization_id, obra_id, source_budget_id, parent_version_id,
    version_type, version_number, version_name, status, reason,
    total_base, total_target, total_awarded, total_purchased, total_remaining,
    created_by
  ) VALUES (
    v_active.user_id, v_active.organization_id, v_active.obra_id, p_source_budget_id, v_active.id,
    'target', v_next_no, 'Budget Objetivo v'||v_next_no, 'active', p_reason,
    v_active.total_base, v_active.total_target, v_active.total_awarded, v_active.total_purchased, v_active.total_remaining,
    v_uid
  ) RETURNING id INTO v_new_id;

  INSERT INTO public.budget_version_items (
    budget_version_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    awarded_amount, purchased_amount, remaining_amount,
    variance_from_base, contracting_status, package_id, supplier_id, notes, ordem
  )
  SELECT
    v_new_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    awarded_amount, purchased_amount, remaining_amount,
    variance_from_base, contracting_status, package_id, supplier_id, notes, ordem
  FROM public.budget_version_items WHERE budget_version_id = v_active.id;

  PERFORM public.log_budget_event(p_source_budget_id, 'target_budget_superseded', v_active.id, 'budget_version', v_active.id, NULL, NULL, 'Versão anterior substituída');
  PERFORM public.log_budget_event(p_source_budget_id, 'target_budget_version_created', v_new_id, 'budget_version', v_new_id, NULL, jsonb_build_object('version_number', v_next_no, 'reason', p_reason), 'Nova versão do Budget Objetivo criada e ativada');

  RETURN v_new_id;
END;
$function$;