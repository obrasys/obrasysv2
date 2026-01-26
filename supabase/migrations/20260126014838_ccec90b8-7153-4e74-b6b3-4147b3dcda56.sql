-- Create table for subempreiteiros (subcontractors)
CREATE TABLE public.subempreiteiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  nif VARCHAR(20),
  email VARCHAR(255),
  telefone VARCHAR(50),
  especialidade VARCHAR(255),
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for equipamentos (equipment inventory)
CREATE TABLE public.equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50),
  categoria VARCHAR(100),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  numero_serie VARCHAR(100),
  data_aquisicao DATE,
  valor_aquisicao NUMERIC(12,2),
  estado VARCHAR(50) NOT NULL DEFAULT 'disponivel',
  localizacao VARCHAR(255),
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for equipa (team members)
CREATE TABLE public.equipa_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(50),
  nif VARCHAR(20),
  data_admissao DATE,
  salario_base NUMERIC(12,2),
  tipo_contrato VARCHAR(50),
  subempreiteiro_id UUID REFERENCES public.subempreiteiros(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subempreiteiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipa_membros ENABLE ROW LEVEL SECURITY;

-- RLS policies for subempreiteiros
CREATE POLICY "Users can view their own subempreiteiros" ON public.subempreiteiros
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subempreiteiros" ON public.subempreiteiros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subempreiteiros" ON public.subempreiteiros
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subempreiteiros" ON public.subempreiteiros
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all subempreiteiros" ON public.subempreiteiros
  FOR SELECT USING (is_super_admin());

-- RLS policies for equipamentos
CREATE POLICY "Users can view their own equipamentos" ON public.equipamentos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own equipamentos" ON public.equipamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipamentos" ON public.equipamentos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipamentos" ON public.equipamentos
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all equipamentos" ON public.equipamentos
  FOR SELECT USING (is_super_admin());

-- RLS policies for equipa_membros
CREATE POLICY "Users can view their own equipa_membros" ON public.equipa_membros
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own equipa_membros" ON public.equipa_membros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipa_membros" ON public.equipa_membros
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipa_membros" ON public.equipa_membros
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all equipa_membros" ON public.equipa_membros
  FOR SELECT USING (is_super_admin());

-- Add updated_at triggers
CREATE TRIGGER update_subempreiteiros_updated_at
  BEFORE UPDATE ON public.subempreiteiros
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_equipa_membros_updated_at
  BEFORE UPDATE ON public.equipa_membros
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();