-- =============================================
-- CADERNOS DE ENCARGOS - Tabelas e Storage
-- =============================================

-- Criar bucket para armazenamento de ficheiros de cadernos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cadernos-encargos', 
  'cadernos-encargos', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/xml', 'text/xml']
);

-- Políticas de storage para o bucket
CREATE POLICY "Users can upload cadernos files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cadernos-encargos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own cadernos files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'cadernos-encargos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own cadernos files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cadernos-encargos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- Tabela principal: cadernos_encargos
-- =============================================
CREATE TABLE public.cadernos_encargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('cliente', 'concurso_publico', 'interno')),
  ficheiro_url TEXT,
  ficheiro_nome TEXT,
  ficheiro_tipo TEXT,
  status TEXT NOT NULL DEFAULT 'importado' CHECK (status IN ('importado', 'a_analisar', 'analisado', 'validado', 'orcamentado')),
  perfil_preco TEXT DEFAULT 'medio' CHECK (perfil_preco IN ('economico', 'medio', 'premium')),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  total_itens INTEGER DEFAULT 0,
  itens_validados INTEGER DEFAULT 0,
  valor_estimado NUMERIC DEFAULT 0,
  metadados JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- Tabela: caderno_secoes (hierarquia)
-- =============================================
CREATE TABLE public.caderno_secoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caderno_id UUID NOT NULL REFERENCES public.cadernos_encargos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.caderno_secoes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  nivel INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- Tabela: caderno_itens
-- =============================================
CREATE TABLE public.caderno_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secao_id UUID NOT NULL REFERENCES public.caderno_secoes(id) ON DELETE CASCADE,
  descricao_original TEXT NOT NULL,
  unidade_detectada TEXT,
  quantidade_detectada NUMERIC,
  texto_original TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'validado', 'ignorado')),
  classificacao JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- Tabela: caderno_item_match (sugestões de matching)
-- =============================================
CREATE TABLE public.caderno_item_match (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caderno_item_id UUID NOT NULL REFERENCES public.caderno_itens(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  artigo_base_id UUID REFERENCES public.default_articles(id) ON DELETE SET NULL,
  metodo_construtivo TEXT,
  unidade_sugerida TEXT,
  preco_estimado NUMERIC DEFAULT 0,
  nivel_confianca INTEGER NOT NULL DEFAULT 0 CHECK (nivel_confianca >= 0 AND nivel_confianca <= 100),
  validado BOOLEAN NOT NULL DEFAULT false,
  validado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validado_em TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- Índices para performance
-- =============================================
CREATE INDEX idx_cadernos_encargos_user ON public.cadernos_encargos(user_id);
CREATE INDEX idx_cadernos_encargos_obra ON public.cadernos_encargos(obra_id);
CREATE INDEX idx_cadernos_encargos_status ON public.cadernos_encargos(status);
CREATE INDEX idx_caderno_secoes_caderno ON public.caderno_secoes(caderno_id);
CREATE INDEX idx_caderno_secoes_parent ON public.caderno_secoes(parent_id);
CREATE INDEX idx_caderno_itens_secao ON public.caderno_itens(secao_id);
CREATE INDEX idx_caderno_item_match_item ON public.caderno_item_match(caderno_item_id);
CREATE INDEX idx_caderno_item_match_material ON public.caderno_item_match(material_id);

-- =============================================
-- RLS Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.cadernos_encargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caderno_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caderno_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caderno_item_match ENABLE ROW LEVEL SECURITY;

-- Políticas para cadernos_encargos
CREATE POLICY "Users can view own cadernos"
ON public.cadernos_encargos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cadernos"
ON public.cadernos_encargos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cadernos"
ON public.cadernos_encargos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cadernos"
ON public.cadernos_encargos FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para caderno_secoes (via caderno ownership)
CREATE POLICY "Users can view caderno secoes"
ON public.caderno_secoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cadernos_encargos c 
    WHERE c.id = caderno_secoes.caderno_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create caderno secoes"
ON public.caderno_secoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cadernos_encargos c 
    WHERE c.id = caderno_secoes.caderno_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update caderno secoes"
ON public.caderno_secoes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cadernos_encargos c 
    WHERE c.id = caderno_secoes.caderno_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete caderno secoes"
ON public.caderno_secoes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cadernos_encargos c 
    WHERE c.id = caderno_secoes.caderno_id AND c.user_id = auth.uid()
  )
);

-- Políticas para caderno_itens (via secao -> caderno ownership)
CREATE POLICY "Users can view caderno itens"
ON public.caderno_itens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.caderno_secoes s 
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE s.id = caderno_itens.secao_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create caderno itens"
ON public.caderno_itens FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.caderno_secoes s 
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE s.id = caderno_itens.secao_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update caderno itens"
ON public.caderno_itens FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.caderno_secoes s 
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE s.id = caderno_itens.secao_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete caderno itens"
ON public.caderno_itens FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.caderno_secoes s 
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE s.id = caderno_itens.secao_id AND c.user_id = auth.uid()
  )
);

-- Políticas para caderno_item_match (via item -> secao -> caderno ownership)
CREATE POLICY "Users can view caderno item match"
ON public.caderno_item_match FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.caderno_itens i
    JOIN public.caderno_secoes s ON s.id = i.secao_id
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE i.id = caderno_item_match.caderno_item_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create caderno item match"
ON public.caderno_item_match FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.caderno_itens i
    JOIN public.caderno_secoes s ON s.id = i.secao_id
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE i.id = caderno_item_match.caderno_item_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update caderno item match"
ON public.caderno_item_match FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.caderno_itens i
    JOIN public.caderno_secoes s ON s.id = i.secao_id
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE i.id = caderno_item_match.caderno_item_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete caderno item match"
ON public.caderno_item_match FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.caderno_itens i
    JOIN public.caderno_secoes s ON s.id = i.secao_id
    JOIN public.cadernos_encargos c ON c.id = s.caderno_id
    WHERE i.id = caderno_item_match.caderno_item_id AND c.user_id = auth.uid()
  )
);

-- =============================================
-- Trigger para updated_at
-- =============================================
CREATE TRIGGER update_cadernos_encargos_updated_at
BEFORE UPDATE ON public.cadernos_encargos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caderno_item_match_updated_at
BEFORE UPDATE ON public.caderno_item_match
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();