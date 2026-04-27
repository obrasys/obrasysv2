-- Tabela de auditoria de geração de orçamentos ICF
CREATE TABLE IF NOT EXISTS public.icf_budget_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  orcamento_id UUID,
  obra_id UUID NOT NULL,
  configuracao_id UUID NOT NULL,
  config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  resumo_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_capitulos INTEGER NOT NULL DEFAULT 0,
  total_artigos INTEGER NOT NULL DEFAULT 0,
  subtotal_custo NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icf_audit_user ON public.icf_budget_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_icf_audit_obra ON public.icf_budget_audit_log(obra_id);
CREATE INDEX IF NOT EXISTS idx_icf_audit_orcamento ON public.icf_budget_audit_log(orcamento_id);

ALTER TABLE public.icf_budget_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ICF audit logs"
ON public.icf_budget_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Apenas a função SECURITY DEFINER pode inserir
CREATE POLICY "System inserts ICF audit logs"
ON public.icf_budget_audit_log
FOR INSERT
WITH CHECK (false);

-- ============================================================
-- Função transacional para gerar orçamento ICF
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_icf_budget_transactional(
  p_obra_id UUID,
  p_configuracao_id UUID,
  p_titulo TEXT,
  p_margem_lucro NUMERIC,
  p_custos_indiretos JSONB,
  p_chapters JSONB,
  p_config_snapshot JSONB,
  p_resumo_snapshot JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_codigo TEXT;
  v_orcamento_id UUID;
  v_capitulo_id UUID;
  v_chapter JSONB;
  v_artigo JSONB;
  v_artigo_index INTEGER;
  v_code_prefix TEXT;
  v_total_capitulos INTEGER := 0;
  v_total_artigos INTEGER := 0;
  v_subtotal_custo NUMERIC := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  IF p_chapters IS NULL OR jsonb_array_length(p_chapters) = 0 THEN
    RAISE EXCEPTION 'Sem capítulos para gerar';
  END IF;

  -- Gerar código
  SELECT public.generate_orcamento_codigo(v_user_id) INTO v_codigo;

  -- Criar orçamento
  INSERT INTO public.orcamentos (
    user_id, titulo, codigo, obra_id, margem_lucro, custos_indiretos, status
  ) VALUES (
    v_user_id, p_titulo, v_codigo, p_obra_id, p_margem_lucro, p_custos_indiretos, 'rascunho'
  )
  RETURNING id INTO v_orcamento_id;

  -- Criar capítulos e artigos
  FOR v_chapter IN SELECT * FROM jsonb_array_elements(p_chapters) LOOP
    INSERT INTO public.capitulos_orcamento (
      orcamento_id, numero, ordem, titulo, descricao
    ) VALUES (
      v_orcamento_id,
      (v_chapter->>'numero')::int,
      (v_chapter->>'numero')::int,
      v_chapter->>'titulo',
      v_chapter->>'descricao'
    )
    RETURNING id INTO v_capitulo_id;

    v_total_capitulos := v_total_capitulos + 1;
    v_code_prefix := UPPER(REGEXP_REPLACE(v_chapter->>'titulo', '[^A-Za-z0-9]', '', 'g'));
    v_code_prefix := SUBSTRING(v_code_prefix FROM 1 FOR 4);
    v_artigo_index := 0;

    FOR v_artigo IN SELECT * FROM jsonb_array_elements(v_chapter->'artigos') LOOP
      v_artigo_index := v_artigo_index + 1;
      INSERT INTO public.artigos_orcamento (
        capitulo_id, codigo, descricao, unidade, quantidade,
        preco_unitario, preco_base, ordem, quantity_source
      ) VALUES (
        v_capitulo_id,
        'ICF.' || v_code_prefix || '.' || LPAD(v_artigo_index::text, 2, '0'),
        v_artigo->>'descricao',
        v_artigo->>'unidade',
        (v_artigo->>'quantidade')::numeric,
        (v_artigo->>'preco_unitario')::numeric,
        (v_artigo->>'preco_unitario')::numeric,
        v_artigo_index,
        'icf_parametric'
      );
      v_total_artigos := v_total_artigos + 1;
      v_subtotal_custo := v_subtotal_custo +
        ((v_artigo->>'quantidade')::numeric * (v_artigo->>'preco_unitario')::numeric);
    END LOOP;
  END LOOP;

  -- Registar auditoria (bypass RLS por SECURITY DEFINER)
  INSERT INTO public.icf_budget_audit_log (
    user_id, orcamento_id, obra_id, configuracao_id,
    config_snapshot, resumo_snapshot, parametros,
    total_capitulos, total_artigos, subtotal_custo, status
  ) VALUES (
    v_user_id, v_orcamento_id, p_obra_id, p_configuracao_id,
    p_config_snapshot, p_resumo_snapshot,
    jsonb_build_object(
      'margem_lucro', p_margem_lucro,
      'custos_indiretos', p_custos_indiretos
    ),
    v_total_capitulos, v_total_artigos, v_subtotal_custo, 'success'
  );

  RETURN jsonb_build_object(
    'orcamento_id', v_orcamento_id,
    'codigo', v_codigo,
    'total_capitulos', v_total_capitulos,
    'total_artigos', v_total_artigos,
    'subtotal_custo', v_subtotal_custo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_icf_budget_transactional(
  UUID, UUID, TEXT, NUMERIC, JSONB, JSONB, JSONB, JSONB
) TO authenticated;