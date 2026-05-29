-- Permite ICF sem obra associada (modo orçamentação pura)
ALTER TABLE public.icf_configuracoes ALTER COLUMN obra_id DROP NOT NULL;

-- Garante que políticas existentes continuam a funcionar quando obra_id é NULL.
-- (As políticas atuais filtram por user_id, então NULL em obra_id é tolerado.)

-- Atualiza RPC para aceitar p_obra_id NULL
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
      COALESCE((v_chapter->>'numero')::int, v_total_capitulos + 1),
      COALESCE((v_chapter->>'numero')::int, v_total_capitulos + 1),
      v_chapter->>'titulo',
      v_chapter->>'descricao'
    )
    RETURNING id INTO v_capitulo_id;

    v_total_capitulos := v_total_capitulos + 1;
    v_artigo_index := 0;

    FOR v_artigo IN SELECT * FROM jsonb_array_elements(COALESCE(v_chapter->'artigos', '[]'::jsonb)) LOOP
      v_artigo_index := v_artigo_index + 1;
      v_code_prefix := 'ICF.' || LPAD((v_chapter->>'numero'), 2, '0') || '.' || LPAD(v_artigo_index::text, 2, '0');

      INSERT INTO public.artigos_orcamento (
        capitulo_id, codigo, descricao, unidade, quantidade, preco_unitario, preco_base, ordem, quantity_source
      ) VALUES (
        v_capitulo_id,
        COALESCE(v_artigo->>'codigo', v_code_prefix),
        v_artigo->>'descricao',
        v_artigo->>'unidade',
        COALESCE((v_artigo->>'quantidade')::numeric, 0),
        COALESCE((v_artigo->>'preco_unitario')::numeric, 0),
        COALESCE((v_artigo->>'preco_unitario')::numeric, 0),
        v_artigo_index,
        'icf_parametric'
      );

      v_total_artigos := v_total_artigos + 1;
      v_subtotal_custo := v_subtotal_custo + COALESCE((v_artigo->>'quantidade')::numeric, 0) * COALESCE((v_artigo->>'preco_unitario')::numeric, 0);
    END LOOP;
  END LOOP;

  -- snapshot
  BEGIN
    INSERT INTO public.icf_budget_snapshots (
      user_id, orcamento_id, obra_id, configuracao_id,
      config_snapshot, resumo_snapshot, chapters_snapshot, parametros
    ) VALUES (
      v_user_id, v_orcamento_id, p_obra_id, p_configuracao_id,
      p_config_snapshot, p_resumo_snapshot, p_chapters,
      jsonb_build_object('margem_lucro', p_margem_lucro, 'custos_indiretos', p_custos_indiretos)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'orcamento_id', v_orcamento_id,
    'codigo', v_codigo,
    'total_capitulos', v_total_capitulos,
    'total_artigos', v_total_artigos,
    'subtotal_custo', v_subtotal_custo
  );
END;
$function$;