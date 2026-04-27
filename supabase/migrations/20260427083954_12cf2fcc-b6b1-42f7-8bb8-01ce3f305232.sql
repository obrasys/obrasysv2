-- Snapshots ICF: registo imutável da configuração + quantitativos por orçamento gerado
CREATE TABLE IF NOT EXISTS public.icf_budget_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  orcamento_id UUID NOT NULL UNIQUE,
  obra_id UUID NOT NULL,
  configuracao_id UUID NOT NULL,
  config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  resumo_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  chapters_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icf_snap_user ON public.icf_budget_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_icf_snap_obra ON public.icf_budget_snapshots(obra_id);
CREATE INDEX IF NOT EXISTS idx_icf_snap_config ON public.icf_budget_snapshots(configuracao_id);

ALTER TABLE public.icf_budget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ICF snapshots"
ON public.icf_budget_snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System inserts ICF snapshots"
ON public.icf_budget_snapshots
FOR INSERT
WITH CHECK (false);

CREATE POLICY "System updates ICF snapshots"
ON public.icf_budget_snapshots
FOR UPDATE
USING (false);

-- Atualizar a função transacional para gravar o snapshot
CREATE OR REPLACE FUNCTION public.generate_icf_budget_transactional(
  p_obra_id uuid,
  p_configuracao_id uuid,
  p_titulo text,
  p_margem_lucro numeric,
  p_custos_indiretos jsonb,
  p_chapters jsonb,
  p_config_snapshot jsonb,
  p_resumo_snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT public.generate_orcamento_codigo(v_user_id) INTO v_codigo;

  INSERT INTO public.orcamentos (
    user_id, titulo, codigo, obra_id, margem_lucro, custos_indiretos, status
  ) VALUES (
    v_user_id, p_titulo, v_codigo, p_obra_id, p_margem_lucro, p_custos_indiretos, 'rascunho'
  )
  RETURNING id INTO v_orcamento_id;

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

  -- Snapshot imutável (referência para regeneração/comparação)
  INSERT INTO public.icf_budget_snapshots (
    user_id, orcamento_id, obra_id, configuracao_id,
    config_snapshot, resumo_snapshot, chapters_snapshot, parametros
  ) VALUES (
    v_user_id, v_orcamento_id, p_obra_id, p_configuracao_id,
    p_config_snapshot, p_resumo_snapshot, p_chapters,
    jsonb_build_object(
      'margem_lucro', p_margem_lucro,
      'custos_indiretos', p_custos_indiretos
    )
  );

  -- Auditoria
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
$function$;