-- Create tarefas table
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluida', 'cancelada', 'bloqueada')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  categoria TEXT,
  data_agendada DATE,
  data_conclusao DATE,
  responsavel_id UUID REFERENCES public.profiles(id),
  dependencias UUID[] DEFAULT '{}',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tarefas_cronograma table
CREATE TABLE public.tarefas_cronograma (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'tarefa' CHECK (tipo IN ('tarefa', 'marco', 'fase', 'entrega')),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  responsavel TEXT,
  categoria TEXT,
  recursos TEXT,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido', 'atrasado', 'cancelado')),
  cor TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_cronograma ENABLE ROW LEVEL SECURITY;

-- RLS policies for tarefas
CREATE POLICY "Users can view their own tarefas"
ON public.tarefas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tarefas"
ON public.tarefas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tarefas"
ON public.tarefas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tarefas"
ON public.tarefas FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for tarefas_cronograma
CREATE POLICY "Users can view their own cronograma"
ON public.tarefas_cronograma FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cronograma"
ON public.tarefas_cronograma FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cronograma"
ON public.tarefas_cronograma FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cronograma"
ON public.tarefas_cronograma FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tarefas_cronograma_updated_at
BEFORE UPDATE ON public.tarefas_cronograma
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();