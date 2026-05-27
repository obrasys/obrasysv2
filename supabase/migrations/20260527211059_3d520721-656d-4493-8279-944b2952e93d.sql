CREATE OR REPLACE FUNCTION public.create_budget_revision(p_orcamento_id uuid)
RETURNS public.orcamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_original public.orcamentos%ROWTYPE;
  v_revision public.orcamentos%ROWTYPE;
  v_next_num integer;
  v_codigo text;
  v_cap record;
  v_new_cap_id uuid;
  v_old_base_id uuid;
  v_new_base_id uuid;
  v_old_target_id uuid;
  v_new_target_id uuid;
  v_old_closing public.closing_sheets%ROWTYPE;
  v_last_parent_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_original
  FROM public.orcamentos
  WHERE id = p_orcamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;

  IF v_original.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissões';
  END IF;

  SELECT COALESCE(MAX(numero_revisao), 0) + 1
  INTO v_next_num
  FROM public.orcamentos
  WHERE revisao_de = p_orcamento_id;

  v_codigo := format('(%s)-%s', COALESCE(v_original.codigo, 'ORC-0000-0000'), lpad(v_next_num::text, 2, '0'));

  INSERT INTO public.orcamentos (
    user_id,
    titulo,
    codigo,
    obra_id,
    cliente_id,
    margem_lucro,
    custos_indiretos,
    project_metadata,
    status,
    revisao_de,
    numero_revisao
  ) VALUES (
    v_uid,
    v_original.titulo || ' - Revisão ' || v_next_num,
    v_codigo,
    v_original.obra_id,
    v_original.cliente_id,
    v_original.margem_lucro,
    v_original.custos_indiretos,
    COALESCE(v_original.project_metadata, '{}'::jsonb),
    'rascunho',
    p_orcamento_id,
    v_next_num
  ) RETURNING * INTO v_revision;

  FOR v_cap IN
    SELECT *
    FROM public.capitulos_orcamento
    WHERE orcamento_id = p_orcamento_id
    ORDER BY ordem, created_at
  LOOP
    INSERT INTO public.capitulos_orcamento (
      orcamento_id,
      numero,
      titulo,
      descricao,
      ordem
    ) VALUES (
      v_revision.id,
      v_cap.numero,
      v_cap.titulo,
      v_cap.descricao,
      v_cap.ordem
    ) RETURNING id INTO v_new_cap_id;

    INSERT INTO public.artigos_orcamento (
      capitulo_id,
      codigo,
      descricao,
      unidade,
      quantidade,
      preco_base,
      margem_lucro_artigo,
      preco_unitario,
      ordem
    )
    SELECT
      v_new_cap_id,
      a.codigo,
      a.descricao,
      a.unidade,
      a.quantidade,
      COALESCE(a.preco_base, a.preco_unitario),
      COALESCE(a.margem_lucro_artigo, 0),
      a.preco_unitario,
      a.ordem
    FROM public.artigos_orcamento a
    WHERE a.capitulo_id = v_cap.id
    ORDER BY a.ordem, a.created_at;
  END LOOP;

  SELECT id INTO v_old_base_id
  FROM public.budget_versions
  WHERE source_budget_id = p_orcamento_id
    AND version_type = 'base_dry'
  ORDER BY version_number DESC, created_at DESC
  LIMIT 1;

  SELECT id INTO v_old_target_id
  FROM public.budget_versions
  WHERE source_budget_id = p_orcamento_id
    AND version_type = 'target'
  ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, version_number DESC, created_at DESC
  LIMIT 1;

  SELECT * INTO v_old_closing
  FROM public.closing_sheets
  WHERE source_budget_id = p_orcamento_id
    AND closing_type = 'initial'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT id INTO v_last_parent_id
  FROM public.budget_versions
  WHERE source_budget_id = p_orcamento_id
  ORDER BY CASE WHEN version_type = 'target' THEN 0 ELSE 1 END, version_number DESC, created_at DESC
  LIMIT 1;

  IF v_old_base_id IS NOT NULL THEN
    INSERT INTO public.budget_versions (
      user_id,
      organization_id,
      obra_id,
      source_budget_id,
      parent_version_id,
      version_type,
      version_number,
      version_name,
      reason,
      status,
      total_base,
      total_target,
      total_awarded,
      total_purchased,
      total_remaining,
      variance_from_base,
      variance_from_previous,
      approved_by,
      approved_at,
      locked_at,
      created_by
    )
    SELECT
      v_revision.user_id,
      organization_id,
      v_revision.obra_id,
      v_revision.id,
      v_last_parent_id,
      version_type,
      version_number,
      version_name,
      reason,
      status,
      total_base,
      total_target,
      total_awarded,
      total_purchased,
      total_remaining,
      variance_from_base,
      variance_from_previous,
      approved_by,
      approved_at,
      locked_at,
      v_uid
    FROM public.budget_versions
    WHERE id = v_old_base_id
    RETURNING id INTO v_new_base_id;

    INSERT INTO public.budget_version_items (
      budget_version_id,
      source_artigo_id,
      source_capitulo_id,
      chapter_code,
      chapter_name,
      codigo,
      description,
      unit,
      base_quantity,
      base_unit_price,
      base_total,
      target_quantity,
      target_unit_price,
      target_total,
      awarded_amount,
      purchased_amount,
      remaining_amount,
      variance_from_base,
      variance_from_previous,
      contracting_status,
      package_id,
      supplier_id,
      notes,
      ordem
    )
    SELECT
      v_new_base_id,
      source_artigo_id,
      source_capitulo_id,
      chapter_code,
      chapter_name,
      codigo,
      description,
      unit,
      base_quantity,
      base_unit_price,
      base_total,
      target_quantity,
      target_unit_price,
      target_total,
      awarded_amount,
      purchased_amount,
      remaining_amount,
      variance_from_base,
      variance_from_previous,
      contracting_status,
      package_id,
      supplier_id,
      notes,
      ordem
    FROM public.budget_version_items
    WHERE budget_version_id = v_old_base_id
    ORDER BY ordem, created_at;
  END IF;

  IF v_old_closing.id IS NOT NULL THEN
    INSERT INTO public.closing_sheets (
      user_id,
      organization_id,
      obra_id,
      source_budget_id,
      budget_version_id,
      closing_type,
      status,
      total_direct_cost,
      total_indirect_cost,
      site_costs,
      structure_costs,
      contingency_amount,
      margin_amount,
      margin_percent,
      sale_price,
      expected_result,
      final_result,
      snapshot,
      approved_by,
      approved_at,
      locked_at,
      notes,
      details
    )
    SELECT
      v_revision.user_id,
      organization_id,
      v_revision.obra_id,
      v_revision.id,
      v_new_base_id,
      closing_type,
      'draft',
      total_direct_cost,
      total_indirect_cost,
      site_costs,
      structure_costs,
      contingency_amount,
      margin_amount,
      margin_percent,
      sale_price,
      expected_result,
      final_result,
      snapshot,
      NULL,
      NULL,
      NULL,
      notes,
      details
    FROM public.closing_sheets
    WHERE id = v_old_closing.id;
  END IF;

  IF v_old_target_id IS NOT NULL THEN
    INSERT INTO public.budget_versions (
      user_id,
      organization_id,
      obra_id,
      source_budget_id,
      parent_version_id,
      version_type,
      version_number,
      version_name,
      reason,
      status,
      total_base,
      total_target,
      total_awarded,
      total_purchased,
      total_remaining,
      variance_from_base,
      variance_from_previous,
      approved_by,
      approved_at,
      locked_at,
      created_by
    )
    SELECT
      v_revision.user_id,
      organization_id,
      v_revision.obra_id,
      v_revision.id,
      COALESCE(v_new_base_id, v_last_parent_id),
      version_type,
      version_number,
      version_name,
      reason,
      'active',
      total_base,
      total_target,
      total_awarded,
      total_purchased,
      total_remaining,
      variance_from_base,
      variance_from_previous,
      NULL,
      NULL,
      NULL,
      v_uid
    FROM public.budget_versions
    WHERE id = v_old_target_id
    RETURNING id INTO v_new_target_id;

    INSERT INTO public.budget_version_items (
      budget_version_id,
      source_artigo_id,
      source_capitulo_id,
      chapter_code,
      chapter_name,
      codigo,
      description,
      unit,
      base_quantity,
      base_unit_price,
      base_total,
      target_quantity,
      target_unit_price,
      target_total,
      awarded_amount,
      purchased_amount,
      remaining_amount,
      variance_from_base,
      variance_from_previous,
      contracting_status,
      package_id,
      supplier_id,
      notes,
      ordem
    )
    SELECT
      v_new_target_id,
      source_artigo_id,
      source_capitulo_id,
      chapter_code,
      chapter_name,
      codigo,
      description,
      unit,
      base_quantity,
      base_unit_price,
      base_total,
      target_quantity,
      target_unit_price,
      target_total,
      awarded_amount,
      purchased_amount,
      remaining_amount,
      variance_from_base,
      variance_from_previous,
      contracting_status,
      package_id,
      supplier_id,
      notes,
      ordem
    FROM public.budget_version_items
    WHERE budget_version_id = v_old_target_id
    ORDER BY ordem, created_at;
  END IF;

  RETURN v_revision;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT o.id, cs.id AS closing_id, cs.user_id, cs.organization_id, cs.obra_id, cs.source_budget_id,
           cs.budget_version_id, cs.closing_type, cs.total_direct_cost, cs.total_indirect_cost,
           cs.site_costs, cs.structure_costs, cs.contingency_amount, cs.margin_amount,
           cs.margin_percent, cs.sale_price, cs.expected_result, cs.final_result, cs.snapshot,
           cs.notes, cs.details
    FROM public.orcamentos o
    JOIN public.closing_sheets cs ON cs.source_budget_id = o.id AND cs.closing_type = 'initial'
    WHERE o.revisao_de IS NOT NULL
      AND o.is_locked = true
      AND o.status = 'aprovado'
      AND cs.status = 'locked'
      AND EXISTS (
        SELECT 1 FROM public.budget_versions bv
        WHERE bv.source_budget_id = o.id
          AND bv.version_type = 'base_dry'
          AND bv.status = 'locked'
      )
      AND EXISTS (
        SELECT 1 FROM public.budget_versions bv
        WHERE bv.source_budget_id = o.id
          AND bv.version_type = 'target'
          AND bv.version_number = 1
          AND bv.status = 'active'
      )
  LOOP
    UPDATE public.orcamentos
    SET status = 'rascunho',
        is_locked = false,
        locked_at = NULL,
        locked_reason = NULL
    WHERE id = r.id;

    DELETE FROM public.closing_sheets
    WHERE id = r.closing_id;

    INSERT INTO public.closing_sheets (
      user_id,
      organization_id,
      obra_id,
      source_budget_id,
      budget_version_id,
      closing_type,
      status,
      total_direct_cost,
      total_indirect_cost,
      site_costs,
      structure_costs,
      contingency_amount,
      margin_amount,
      margin_percent,
      sale_price,
      expected_result,
      final_result,
      snapshot,
      approved_by,
      approved_at,
      locked_at,
      notes,
      details
    ) VALUES (
      r.user_id,
      r.organization_id,
      r.obra_id,
      r.source_budget_id,
      r.budget_version_id,
      r.closing_type,
      'draft',
      r.total_direct_cost,
      r.total_indirect_cost,
      r.site_costs,
      r.structure_costs,
      r.contingency_amount,
      r.margin_amount,
      r.margin_percent,
      r.sale_price,
      r.expected_result,
      r.final_result,
      r.snapshot,
      NULL,
      NULL,
      NULL,
      r.notes,
      r.details
    );
  END LOOP;
END;
$$;