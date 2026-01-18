-- =============================================
-- MÓDULO DE GESTÃO DE RDOs (Relatórios Diários de Obra)
-- =============================================

-- 1. Criar tabela de relatórios diários
CREATE TABLE public.relatorios_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Data do relatório
  data DATE NOT NULL,
  
  -- Conteúdo do relatório
  trabalhos_executados TEXT,
  ocorrencias TEXT,
  observacoes TEXT,
  
  -- Trabalhos quantificados (JSON array para cálculo automático)
  -- Estrutura: [{ descricao: string, quantidade: number, unidade: string, artigo_id?: string }]
  trabalhos_quantificados JSONB DEFAULT '[]'::jsonb,
  
  -- Condições do dia
  condicoes_meteorologicas TEXT,
  mao_de_obra_presente INTEGER DEFAULT 0,
  
  -- Status do relatório
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'submetido', 'aprovado')),
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Garantir apenas 1 RDO por obra por dia
  UNIQUE(obra_id, data)
);

-- Índices
CREATE INDEX idx_relatorios_diarios_obra_id ON public.relatorios_diarios(obra_id);
CREATE INDEX idx_relatorios_diarios_user_id ON public.relatorios_diarios(user_id);
CREATE INDEX idx_relatorios_diarios_data ON public.relatorios_diarios(data DESC);
CREATE INDEX idx_relatorios_diarios_status ON public.relatorios_diarios(status);

-- Trigger para updated_at
CREATE TRIGGER update_relatorios_diarios_updated_at
  BEFORE UPDATE ON public.relatorios_diarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- POLÍTICAS RLS
-- =============================================

ALTER TABLE public.relatorios_diarios ENABLE ROW LEVEL SECURITY;

-- Utilizadores podem ver RDOs das suas obras
CREATE POLICY "Users can view RDOs of their obras"
  ON public.relatorios_diarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = relatorios_diarios.obra_id
      AND o.user_id = auth.uid()
    )
  );

-- Utilizadores podem criar RDOs para as suas obras
CREATE POLICY "Users can create RDOs for their obras"
  ON public.relatorios_diarios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = relatorios_diarios.obra_id
      AND o.user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

-- Utilizadores podem atualizar RDOs das suas obras
CREATE POLICY "Users can update RDOs of their obras"
  ON public.relatorios_diarios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = relatorios_diarios.obra_id
      AND o.user_id = auth.uid()
    )
  );

-- Utilizadores podem eliminar RDOs das suas obras
CREATE POLICY "Users can delete RDOs of their obras"
  ON public.relatorios_diarios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = relatorios_diarios.obra_id
      AND o.user_id = auth.uid()
    )
  );