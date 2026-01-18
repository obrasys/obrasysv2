-- =============================================
-- MÓDULO DE GESTÃO DE CLIENTES
-- =============================================

-- 1. Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados básicos
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  telemovel TEXT,
  
  -- Dados da empresa
  empresa TEXT,
  nif TEXT,
  
  -- Endereço
  endereco TEXT,
  codigo_postal TEXT,
  cidade TEXT,
  pais TEXT DEFAULT 'Portugal',
  
  -- Configurações
  nivel_acesso TEXT NOT NULL DEFAULT 'basico' CHECK (nivel_acesso IN ('basico', 'intermediario', 'completo')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Notas
  observacoes TEXT,
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para clientes
CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_clientes_email ON public.clientes(email);
CREATE INDEX idx_clientes_nif ON public.clientes(nif);
CREATE INDEX idx_clientes_ativo ON public.clientes(ativo);

-- 2. Criar tabela de customer_assignments
CREATE TABLE public.customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(customer_id, assigned_user_id)
);

-- Índices para customer_assignments
CREATE INDEX idx_customer_assignments_customer_id ON public.customer_assignments(customer_id);
CREATE INDEX idx_customer_assignments_user_id ON public.customer_assignments(assigned_user_id);

-- 3. Adicionar cliente_id às obras
ALTER TABLE public.obras ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
CREATE INDEX idx_obras_cliente_id ON public.obras(cliente_id);

-- 4. Adicionar cliente_id aos orcamentos
ALTER TABLE public.orcamentos ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
CREATE INDEX idx_orcamentos_cliente_id ON public.orcamentos(cliente_id);

-- 5. Trigger para updated_at em clientes
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- RLS para clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
  ON public.clientes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON public.clientes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON public.clientes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS para customer_assignments
ALTER TABLE public.customer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments of their clients"
  ON public.customer_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = customer_assignments.customer_id 
    AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can create assignments for their clients"
  ON public.customer_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = customer_assignments.customer_id 
    AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete assignments of their clients"
  ON public.customer_assignments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = customer_assignments.customer_id 
    AND c.user_id = auth.uid()
  ));