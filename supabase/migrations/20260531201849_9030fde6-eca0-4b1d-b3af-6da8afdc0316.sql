
-- Adicionar suporte a versões de trabalho do Budget no orçamento
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS budget_version_number INTEGER,
  ADD COLUMN IF NOT EXISTS budget_version_status TEXT
    CHECK (budget_version_status IN ('active','locked'));

-- 1 só versão "active" por orçamento base
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_active_unique
  ON public.orcamentos (revisao_de)
  WHERE budget_version_status = 'active';

CREATE INDEX IF NOT EXISTS idx_orcamentos_budget_versions
  ON public.orcamentos (revisao_de, budget_version_number)
  WHERE budget_version_number IS NOT NULL;

-- RPC: cria nova versão de trabalho do Budget (clona base ou versão indicada)
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

  -- Verifica acesso via user_id (RLS normal valida o resto)
  IF v_base.user_id <> v_uid AND NOT EXISTS (
    SELECT 1 FROM public.orcamentos WHERE id = p_base_id
  ) THEN
    RAISE EXCEPTION 'Sem acesso';
  END IF;

  -- Bloquear versão ativa anterior (se existir)
  UPDATE public.orcamentos
    SET budget_version_status = 'locked',
        is_locked = TRUE,
        locked_at = COALESCE(locked_at, NOW())
  WHERE revisao_de = p_base_id
    AND budget_version_status = 'active';

  -- Próximo número
  SELECT COALESCE(MAX(budget_version_number), 0) + 1 INTO v_next_n
    FROM public.orcamentos WHERE revisao_de = p_base_id;

  v_clone_id := COALESCE(p_clone_from, p_base_id);

  -- Cria novo orçamento (clone do base/clone)
  INSERT INTO public.orcamentos (
    obra_id, user_id, titulo, codigo, status,
    valor_total, margem_lucro, custos_indiretos, cliente_id,
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
    0, margem_lucro, custos_indiretos, cliente_id,
    p_base_id, v_next_n,
    v_next_n, 'active',
    client_document_mode_default, commercial_intro_text,
    commercial_payment_terms_text, commercial_validity_text,
    commercial_notes_text, show_signature_block,
    project_metadata, cost_center_id, observations_text,
    FALSE
  FROM public.orcamentos WHERE id = v_clone_id
  RETURNING id INTO v_new_id;

  -- Clonar capítulos e artigos
  FOR v_cap IN
    SELECT * FROM public.capitulos_orcamento
    WHERE orcamento_id = v_clone_id
    ORDER BY ordem, numero
  LOOP
    INSERT INTO public.capitulos_orcamento (
      orcamento_id, numero, titulo, descricao, valor_total,
      desconto_pct, ordem,
      client_summary_title, client_summary_text, client_exclusions_text,
      include_in_client_summary, client_summary_order
    ) VALUES (
      v_new_id, v_cap.numero, v_cap.titulo, v_cap.descricao, v_cap.valor_total,
      v_cap.desconto_pct, v_cap.ordem,
      v_cap.client_summary_title, v_cap.client_summary_text, v_cap.client_exclusions_text,
      v_cap.include_in_client_summary, v_cap.client_summary_order
    ) RETURNING id INTO v_new_cap_id;

    INSERT INTO public.artigos_orcamento (
      capitulo_id, codigo, descricao, unidade, quantidade,
      preco_unitario, preco_base, margem_lucro_artigo, valor_total, ordem,
      custo_mo, custo_mat, custo_sub, custo_srv, custo_alu, custo_div
    )
    SELECT
      v_new_cap_id, codigo, descricao, unidade, quantidade,
      preco_unitario, preco_base, margem_lucro_artigo, valor_total, ordem,
      custo_mo, custo_mat, custo_sub, custo_srv, custo_alu, custo_div
    FROM public.artigos_orcamento
    WHERE capitulo_id = v_cap.id;
  END LOOP;

  RETURN v_new_id;
END;
$$;

-- RPC: fecha versão ativa (lock)
CREATE OR REPLACE FUNCTION public.lock_budget_working_version(p_budget_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  UPDATE public.orcamentos
     SET budget_version_status = 'locked',
         is_locked = TRUE,
         locked_at = COALESCE(locked_at, NOW())
   WHERE id = p_budget_id
     AND budget_version_number IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_budget_working_version(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_budget_working_version(UUID) TO authenticated;
