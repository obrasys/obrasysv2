
-- Tabela de alocações de membros da equipa a obras
CREATE TABLE public.alocacoes_obra (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  membro_id uuid NOT NULL REFERENCES public.equipa_membros(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  funcao varchar,
  custo_hora numeric,
  custo_dia numeric,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_alocacoes_obra_membro ON public.alocacoes_obra(membro_id);
CREATE INDEX idx_alocacoes_obra_obra ON public.alocacoes_obra(obra_id);
CREATE INDEX idx_alocacoes_obra_user ON public.alocacoes_obra(user_id);

-- RLS
ALTER TABLE public.alocacoes_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alocacoes"
  ON public.alocacoes_obra FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all alocacoes"
  ON public.alocacoes_obra FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Users can create their own alocacoes"
  ON public.alocacoes_obra FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alocacoes"
  ON public.alocacoes_obra FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alocacoes"
  ON public.alocacoes_obra FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_alocacoes_obra_updated_at
  BEFORE UPDATE ON public.alocacoes_obra
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar obra_atual_id a equipa_membros
ALTER TABLE public.equipa_membros
  ADD COLUMN obra_atual_id uuid REFERENCES public.obras(id) ON DELETE SET NULL;

-- Adicionar membro_id a tarefas_cronograma
ALTER TABLE public.tarefas_cronograma
  ADD COLUMN membro_id uuid REFERENCES public.equipa_membros(id) ON DELETE SET NULL;
