-- Update buscar_historico_match to include extensions in search_path
CREATE OR REPLACE FUNCTION public.buscar_historico_match(p_user_id uuid, p_descricao text, p_limite integer DEFAULT 5)
 RETURNS TABLE(material_id uuid, artigo_id uuid, unidade_correta text, metodo_construtivo text, similaridade double precision, vezes_usado integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public, extensions'
AS $function$
DECLARE
  v_descricao_norm TEXT;
BEGIN
  v_descricao_norm := public.normalizar_descricao(p_descricao);
  
  RETURN QUERY
  SELECT 
    h.material_id,
    h.artigo_id,
    h.unidade_correta,
    h.metodo_construtivo,
    extensions.similarity(h.descricao_normalizada, v_descricao_norm)::double precision AS similaridade,
    h.vezes_usado
  FROM public.caderno_validacao_historico h
  WHERE h.user_id = p_user_id
    AND extensions.similarity(h.descricao_normalizada, v_descricao_norm) > 0.3
  ORDER BY 
    extensions.similarity(h.descricao_normalizada, v_descricao_norm) DESC,
    h.vezes_usado DESC
  LIMIT p_limite;
END;
$function$;