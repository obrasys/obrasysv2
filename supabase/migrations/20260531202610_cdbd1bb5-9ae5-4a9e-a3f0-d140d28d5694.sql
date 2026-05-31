
CREATE OR REPLACE FUNCTION public.create_budget_working_version(
  p_base_id UUID,
  p_clone_from UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_base RECORD;
  v_clone_id UUID;
  v_next_n INTEGER;
  v_new_id UUID;
  v_cap RECORD;
  v_new_cap_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_base FROM public.orcamentos
    WHERE id = p_base_id AND budget_version_number IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento base não encontrado';
  END IF;

  IF v_base.user_id <> v_uid AND NOT EXISTS (
    SELECT 1 FROM public.orcamentos WHERE id = p_base_id
  ) THEN
    RAISE EXCEPTION 'Sem acesso';
  END IF;

  UPDATE public.orcamentos
    SET budget_version_status = 'locked',
        is_locked = TRUE,
        locked_at = COALESCE(locked_at, NOW())
  WHERE revisao_de = p_base_id
    AND budget_version_status = 'active';

  SELECT COALESCE(MAX(budget_version_number), 0) + 1 INTO v_next_n
    FROM public.orcamentos WHERE revisao_de = p_base_id;

  v_clone_id := COALESCE(p_clone_from, p_base_id);

  -- valor_total é coluna gerada: NÃO incluir no INSERT
  INSERT INTO public.orcamentos (
    obra_id, user_id, titulo, codigo, status,
    margem_lucro, custos_indiretos, cliente_id,
    revisao_de, numero_revisao,
    budget_version_number, budget_version_status,
    client_document_mode_default, commercial_intro_text,
    commercial_payment_terms_text, commercial_validity_text,
    commercial_notes_text, show_signature_block,
    project_metadata, cost_center_id, observations_text,
    is_locked
  )
  SELECT
    obra_id, v_uid,
    titulo || ' · Budget V' || v_next_n,
    codigo, 'rascunho',
    margem_lucro, custos_indiretos, cliente_id,
    p_base_id, v_next_n,
    v_next_n, 'active',
    client_document_mode_default, commercial_intro_text,
    commercial_payment_terms_text, commercial_validity_text,
    commercial_notes_text, show_signature_block,
    project_metadata, cost_center_id, observations_text,
    FALSE
  FROM public.orcamentos WHERE id = v_clone_id
  RETURNING id INTO v_new_id;

  FOR v_cap IN
    SELECT * FROM public.capitulos_orcamento
    WHERE orcamento_id = v_clone_id
    ORDER BY ordem, numero
  LOOP
    -- valor_total em capitulos_orcamento também é gerado
    INSERT INTO public.capitulos_orcamento (
      orcamento_id, numero, titulo, descricao,
      desconto_pct, ordem,
      client_summary_title, client_summary_text, client_exclusions_text,
      include_in_client_summary, client_summary_order
    ) VALUES (
      v_new_id, v_cap.numero, v_cap.titulo, v_cap.descricao,
      v_cap.desconto_pct, v_cap.ordem,
      v_cap.client_summary_title, v_cap.client_summary_text, v_cap.client_exclusions_text,
      v_cap.include_in_client_summary, v_cap.client_summary_order
    ) RETURNING id INTO v_new_cap_id;

    -- valor_total em artigos_orcamento também é gerado
    INSERT INTO public.artigos_orcamento (
      capitulo_id, codigo, descricao, unidade, quantidade,
      preco_unitario, preco_base, margem_lucro_artigo, ordem,
      custo_mo, custo_mat, custo_sub, custo_srv, custo_alu, custo_div
    )
    SELECT
      v_new_cap_id, codigo, descricao, unidade, quantidade,
      preco_unitario, preco_base, margem_lucro_artigo, ordem,
      custo_mo, custo_mat, custo_sub, custo_srv, custo_alu, custo_div
    FROM public.artigos_orcamento
    WHERE capitulo_id = v_cap.id;
  END LOOP;

  RETURN v_new_id;
END;
$$;
