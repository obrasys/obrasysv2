-- Tabela para histórico de validações (aprendizagem)
CREATE TABLE public.caderno_validacao_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao_original TEXT NOT NULL,
  descricao_normalizada TEXT NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  artigo_id UUID REFERENCES public.default_articles(id) ON DELETE SET NULL,
  unidade_original TEXT,
  unidade_correta TEXT,
  metodo_construtivo TEXT,
  tipo_trabalho TEXT,
  foi_correcao BOOLEAN NOT NULL DEFAULT false,
  confianca_original INTEGER,
  vezes_usado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para busca eficiente
CREATE INDEX idx_validacao_historico_user ON public.caderno_validacao_historico(user_id);
CREATE INDEX idx_validacao_historico_descricao ON public.caderno_validacao_historico USING gin(to_tsvector('portuguese', descricao_normalizada));
CREATE INDEX idx_validacao_historico_material ON public.caderno_validacao_historico(material_id) WHERE material_id IS NOT NULL;
CREATE INDEX idx_validacao_historico_artigo ON public.caderno_validacao_historico(artigo_id) WHERE artigo_id IS NOT NULL;

-- RLS
ALTER TABLE public.caderno_validacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own validation history"
  ON public.caderno_validacao_historico FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own validation history"
  ON public.caderno_validacao_historico FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own validation history"
  ON public.caderno_validacao_historico FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_validacao_historico_updated_at
  BEFORE UPDATE ON public.caderno_validacao_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para normalizar descrição (remover números, unidades, pontuação)
CREATE OR REPLACE FUNCTION public.normalizar_descricao(texto TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(texto, '\d+([,\.]\d+)?', '', 'g'),  -- Remove números
        '\b(m2|m3|ml|m²|m³|un|kg|vg|l|cm|mm)\b', '', 'gi' -- Remove unidades
      ),
      '[^\w\s]', '', 'g'  -- Remove pontuação
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Função para buscar matches do histórico
CREATE OR REPLACE FUNCTION public.buscar_historico_match(
  p_user_id UUID,
  p_descricao TEXT,
  p_limite INTEGER DEFAULT 5
)
RETURNS TABLE (
  material_id UUID,
  artigo_id UUID,
  unidade_correta TEXT,
  metodo_construtivo TEXT,
  similaridade FLOAT,
  vezes_usado INTEGER
) AS $$
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
    similarity(h.descricao_normalizada, v_descricao_norm) AS similaridade,
    h.vezes_usado
  FROM public.caderno_validacao_historico h
  WHERE h.user_id = p_user_id
    AND similarity(h.descricao_normalizada, v_descricao_norm) > 0.3
  ORDER BY 
    similarity(h.descricao_normalizada, v_descricao_norm) DESC,
    h.vezes_usado DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Habilitar extensão pg_trgm para similaridade de texto
CREATE EXTENSION IF NOT EXISTS pg_trgm;