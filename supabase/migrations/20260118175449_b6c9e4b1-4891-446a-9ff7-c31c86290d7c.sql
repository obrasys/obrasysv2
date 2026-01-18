-- Criar tabela de categorias financeiras personalizadas
CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('mao_de_obra', 'material', 'outros')),
  cor TEXT DEFAULT '#6b7280',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, nome, origem)
);

-- Adicionar coluna categoria_id na tabela contas_financeiras
ALTER TABLE public.contas_financeiras
ADD COLUMN categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categorias
CREATE POLICY "Users can view their own categories"
ON public.categorias_financeiras FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.categorias_financeiras FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.categorias_financeiras FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.categorias_financeiras FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_categorias_financeiras_updated_at
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para performance
CREATE INDEX idx_categorias_financeiras_user_id ON public.categorias_financeiras(user_id);
CREATE INDEX idx_categorias_financeiras_origem ON public.categorias_financeiras(origem);
CREATE INDEX idx_contas_financeiras_categoria_id ON public.contas_financeiras(categoria_id);