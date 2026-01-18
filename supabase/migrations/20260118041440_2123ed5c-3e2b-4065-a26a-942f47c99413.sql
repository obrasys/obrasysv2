-- Create aprovacoes table
CREATE TABLE public.aprovacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('rdo', 'documento', 'livro_obra', 'checklist')),
  referencia_id UUID NOT NULL,
  solicitante_id UUID REFERENCES public.profiles(id),
  aprovador_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  comentarios TEXT,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create livro_obra table
CREATE TABLE public.livro_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  rdos_incluidos UUID[] DEFAULT '{}',
  gestor_id UUID REFERENCES public.profiles(id),
  fiscal_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pendente', 'submetido', 'aprovado', 'rejeitado')),
  data_submissao TIMESTAMPTZ,
  data_aprovacao TIMESTAMPTZ,
  observacoes_fiscal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create documentos table
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('licenca', 'projeto', 'certificado', 'relatorio', 'contrato', 'outro')),
  categoria TEXT,
  url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  aprovado BOOLEAN DEFAULT false,
  data_validade DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create checklist_conformidade table
CREATE TABLE public.checklist_conformidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  itens JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluido')),
  responsavel_id UUID REFERENCES public.profiles(id),
  data_verificacao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.aprovacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livro_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_conformidade ENABLE ROW LEVEL SECURITY;

-- RLS policies for aprovacoes
CREATE POLICY "Users can view their own aprovacoes" ON public.aprovacoes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own aprovacoes" ON public.aprovacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own aprovacoes" ON public.aprovacoes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own aprovacoes" ON public.aprovacoes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for livro_obra
CREATE POLICY "Users can view their own livro_obra" ON public.livro_obra
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own livro_obra" ON public.livro_obra
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own livro_obra" ON public.livro_obra
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own livro_obra" ON public.livro_obra
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for documentos
CREATE POLICY "Users can view their own documentos" ON public.documentos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documentos" ON public.documentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documentos" ON public.documentos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documentos" ON public.documentos
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for checklist_conformidade
CREATE POLICY "Users can view their own checklist_conformidade" ON public.checklist_conformidade
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own checklist_conformidade" ON public.checklist_conformidade
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own checklist_conformidade" ON public.checklist_conformidade
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own checklist_conformidade" ON public.checklist_conformidade
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_aprovacoes_updated_at
  BEFORE UPDATE ON public.aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_livro_obra_updated_at
  BEFORE UPDATE ON public.livro_obra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_conformidade_updated_at
  BEFORE UPDATE ON public.checklist_conformidade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();