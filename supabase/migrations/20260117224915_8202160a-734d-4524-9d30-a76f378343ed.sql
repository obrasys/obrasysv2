-- =============================================
-- MÓDULO DE ORÇAMENTOS - TABELAS E POLÍTICAS
-- =============================================

-- 1. Tabela de Obras (pré-requisito)
CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cliente TEXT,
  endereco TEXT,
  status TEXT NOT NULL DEFAULT 'planeamento',
  data_inicio DATE,
  data_fim DATE,
  valor_previsto DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de Orçamentos
CREATE TABLE public.orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  valor_total DECIMAL(14,2) DEFAULT 0,
  margem_lucro DECIMAL(5,2) DEFAULT 15,
  custos_indiretos JSONB DEFAULT '{"estaleiro": 0, "seguros": 0, "licenciamento": 0}'::jsonb,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_envio TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de Capítulos de Orçamento
CREATE TABLE public.capitulos_orcamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_total DECIMAL(14,2) DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela de Artigos de Orçamento
CREATE TABLE public.artigos_orcamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capitulo_id UUID NOT NULL REFERENCES public.capitulos_orcamento(id) ON DELETE CASCADE,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade DECIMAL(14,3) NOT NULL DEFAULT 0,
  preco_unitario DECIMAL(14,2) NOT NULL DEFAULT 0,
  valor_total DECIMAL(14,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela de Artigos de Trabalho (catálogo da empresa)
CREATE TABLE public.artigos_trabalho (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_unitario DECIMAL(14,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela de Base de Preços Personalizada
CREATE TABLE public.base_precos_personalizada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_unitario DECIMAL(14,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela de Artigos Padrão do Sistema
CREATE TABLE public.default_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_unitario DECIMAL(14,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Tabela de Templates de Capítulos
CREATE TABLE public.templates_capitulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  artigos JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capitulos_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artigos_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artigos_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_precos_personalizada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_capitulos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS - OBRAS
-- =============================================

CREATE POLICY "Users can view their own obras"
ON public.obras FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own obras"
ON public.obras FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own obras"
ON public.obras FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own obras"
ON public.obras FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS - ORÇAMENTOS
-- =============================================

CREATE POLICY "Users can view their own orcamentos"
ON public.orcamentos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orcamentos"
ON public.orcamentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orcamentos"
ON public.orcamentos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orcamentos"
ON public.orcamentos FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS - CAPÍTULOS (via orçamento)
-- =============================================

CREATE POLICY "Users can view capitulos of their orcamentos"
ON public.capitulos_orcamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = orcamento_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create capitulos in their orcamentos"
ON public.capitulos_orcamento FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = orcamento_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update capitulos of their orcamentos"
ON public.capitulos_orcamento FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = orcamento_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete capitulos of their orcamentos"
ON public.capitulos_orcamento FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = orcamento_id AND o.user_id = auth.uid()
  )
);

-- =============================================
-- POLÍTICAS RLS - ARTIGOS (via capítulo -> orçamento)
-- =============================================

CREATE POLICY "Users can view artigos of their orcamentos"
ON public.artigos_orcamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.capitulos_orcamento c
    JOIN public.orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = capitulo_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create artigos in their orcamentos"
ON public.artigos_orcamento FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.capitulos_orcamento c
    JOIN public.orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = capitulo_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update artigos of their orcamentos"
ON public.artigos_orcamento FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.capitulos_orcamento c
    JOIN public.orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = capitulo_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete artigos of their orcamentos"
ON public.artigos_orcamento FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.capitulos_orcamento c
    JOIN public.orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = capitulo_id AND o.user_id = auth.uid()
  )
);

-- =============================================
-- POLÍTICAS RLS - ARTIGOS TRABALHO (catálogo empresa)
-- =============================================

CREATE POLICY "Users can view their own artigos_trabalho"
ON public.artigos_trabalho FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own artigos_trabalho"
ON public.artigos_trabalho FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artigos_trabalho"
ON public.artigos_trabalho FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artigos_trabalho"
ON public.artigos_trabalho FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS - BASE PREÇOS PERSONALIZADA
-- =============================================

CREATE POLICY "Users can view their own base_precos"
ON public.base_precos_personalizada FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own base_precos"
ON public.base_precos_personalizada FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own base_precos"
ON public.base_precos_personalizada FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own base_precos"
ON public.base_precos_personalizada FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS - ARTIGOS PADRÃO (leitura para todos autenticados)
-- =============================================

CREATE POLICY "Authenticated users can view default_articles"
ON public.default_articles FOR SELECT
TO authenticated
USING (true);

-- =============================================
-- POLÍTICAS RLS - TEMPLATES CAPÍTULOS
-- =============================================

CREATE POLICY "Users can view own templates and system templates"
ON public.templates_capitulos FOR SELECT
USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
ON public.templates_capitulos FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own templates"
ON public.templates_capitulos FOR UPDATE
USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own templates"
ON public.templates_capitulos FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_obras_updated_at
BEFORE UPDATE ON public.obras
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orcamentos_updated_at
BEFORE UPDATE ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_capitulos_updated_at
BEFORE UPDATE ON public.capitulos_orcamento
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_artigos_orcamento_updated_at
BEFORE UPDATE ON public.artigos_orcamento
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_artigos_trabalho_updated_at
BEFORE UPDATE ON public.artigos_trabalho
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_base_precos_updated_at
BEFORE UPDATE ON public.base_precos_personalizada
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates_capitulos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- TRIGGER PARA ATUALIZAR VALOR TOTAL DO CAPÍTULO
-- =============================================

CREATE OR REPLACE FUNCTION public.update_capitulo_valor_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.capitulos_orcamento
  SET valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM public.artigos_orcamento
    WHERE capitulo_id = COALESCE(NEW.capitulo_id, OLD.capitulo_id)
  )
  WHERE id = COALESCE(NEW.capitulo_id, OLD.capitulo_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_capitulo_total_on_artigo_change
AFTER INSERT OR UPDATE OR DELETE ON public.artigos_orcamento
FOR EACH ROW EXECUTE FUNCTION public.update_capitulo_valor_total();

-- =============================================
-- TRIGGER PARA ATUALIZAR VALOR TOTAL DO ORÇAMENTO
-- =============================================

CREATE OR REPLACE FUNCTION public.update_orcamento_valor_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orcamentos
  SET valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM public.capitulos_orcamento
    WHERE orcamento_id = COALESCE(NEW.orcamento_id, OLD.orcamento_id)
  )
  WHERE id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_orcamento_total_on_capitulo_change
AFTER INSERT OR UPDATE OR DELETE ON public.capitulos_orcamento
FOR EACH ROW EXECUTE FUNCTION public.update_orcamento_valor_total();

-- =============================================
-- INSERIR ARTIGOS PADRÃO DO SISTEMA
-- =============================================

INSERT INTO public.default_articles (codigo, descricao, unidade, preco_unitario, categoria) VALUES
-- Demolições
('DEM.001', 'Demolição de alvenaria de tijolo', 'm3', 35.00, 'Demolições'),
('DEM.002', 'Demolição de betão armado', 'm3', 85.00, 'Demolições'),
('DEM.003', 'Remoção de revestimentos cerâmicos', 'm2', 8.50, 'Demolições'),
('DEM.004', 'Remoção de pavimentos', 'm2', 12.00, 'Demolições'),

-- Movimentação de Terras
('MOV.001', 'Escavação a céu aberto', 'm3', 8.50, 'Movimentação de Terras'),
('MOV.002', 'Aterro com compactação', 'm3', 12.00, 'Movimentação de Terras'),
('MOV.003', 'Transporte de terras', 'm3', 6.50, 'Movimentação de Terras'),
('MOV.004', 'Regularização de terreno', 'm2', 3.50, 'Movimentação de Terras'),

-- Estruturas
('EST.001', 'Betão armado C25/30 em fundações', 'm3', 185.00, 'Estruturas'),
('EST.002', 'Betão armado C25/30 em pilares', 'm3', 245.00, 'Estruturas'),
('EST.003', 'Betão armado C25/30 em vigas', 'm3', 225.00, 'Estruturas'),
('EST.004', 'Betão armado C25/30 em lajes', 'm3', 195.00, 'Estruturas'),
('EST.005', 'Aço A400NR em armaduras', 'kg', 1.85, 'Estruturas'),
('EST.006', 'Cofragem tradicional', 'm2', 28.00, 'Estruturas'),

-- Alvenarias
('ALV.001', 'Alvenaria de tijolo 11cm', 'm2', 22.50, 'Alvenarias'),
('ALV.002', 'Alvenaria de tijolo 15cm', 'm2', 26.00, 'Alvenarias'),
('ALV.003', 'Alvenaria de tijolo 22cm', 'm2', 32.00, 'Alvenarias'),
('ALV.004', 'Parede de blocos de betão', 'm2', 35.00, 'Alvenarias'),

-- Revestimentos
('REV.001', 'Reboco interior', 'm2', 14.50, 'Revestimentos'),
('REV.002', 'Reboco exterior', 'm2', 18.00, 'Revestimentos'),
('REV.003', 'Estuque projetado', 'm2', 8.50, 'Revestimentos'),
('REV.004', 'Revestimento cerâmico parede', 'm2', 32.00, 'Revestimentos'),
('REV.005', 'Impermeabilização com tela', 'm2', 25.00, 'Revestimentos'),

-- Pavimentos
('PAV.001', 'Betonilha de regularização', 'm2', 12.50, 'Pavimentos'),
('PAV.002', 'Pavimento cerâmico', 'm2', 38.00, 'Pavimentos'),
('PAV.003', 'Pavimento flutuante', 'm2', 28.00, 'Pavimentos'),
('PAV.004', 'Pavimento em madeira maciça', 'm2', 75.00, 'Pavimentos'),
('PAV.005', 'Rodapé cerâmico', 'ml', 12.00, 'Pavimentos'),

-- Carpintarias
('CAR.001', 'Porta interior completa', 'un', 285.00, 'Carpintarias'),
('CAR.002', 'Porta de entrada blindada', 'un', 850.00, 'Carpintarias'),
('CAR.003', 'Roupeiro embutido', 'ml', 450.00, 'Carpintarias'),
('CAR.004', 'Cozinha modular', 'ml', 650.00, 'Carpintarias'),

-- Serralharias
('SER.001', 'Janela de alumínio com vidro duplo', 'm2', 185.00, 'Serralharias'),
('SER.002', 'Porta de alumínio', 'm2', 195.00, 'Serralharias'),
('SER.003', 'Guarda metálica', 'ml', 125.00, 'Serralharias'),
('SER.004', 'Portão de garagem automático', 'un', 1850.00, 'Serralharias'),

-- Pinturas
('PIN.001', 'Pintura interior a tinta plástica', 'm2', 6.50, 'Pinturas'),
('PIN.002', 'Pintura exterior a tinta plástica', 'm2', 8.50, 'Pinturas'),
('PIN.003', 'Pintura a esmalte', 'm2', 12.00, 'Pinturas'),
('PIN.004', 'Envernizamento de madeiras', 'm2', 14.00, 'Pinturas'),

-- Instalações Técnicas
('INS.001', 'Ponto de água fria', 'un', 45.00, 'Instalações Técnicas'),
('INS.002', 'Ponto de água quente', 'un', 55.00, 'Instalações Técnicas'),
('INS.003', 'Ponto de esgoto', 'un', 38.00, 'Instalações Técnicas'),
('INS.004', 'Ponto elétrico', 'un', 28.00, 'Instalações Técnicas'),
('INS.005', 'Quadro elétrico', 'un', 450.00, 'Instalações Técnicas'),
('INS.006', 'Instalação de AVAC', 'un', 2500.00, 'Instalações Técnicas'),

-- Equipamentos
('EQU.001', 'Sanita completa', 'un', 285.00, 'Equipamentos'),
('EQU.002', 'Lavatório com móvel', 'un', 350.00, 'Equipamentos'),
('EQU.003', 'Base de duche com resguardo', 'un', 485.00, 'Equipamentos'),
('EQU.004', 'Banheira acrílica', 'un', 650.00, 'Equipamentos'),
('EQU.005', 'Torneira de lavatório', 'un', 85.00, 'Equipamentos'),
('EQU.006', 'Torneira de cozinha', 'un', 125.00, 'Equipamentos');