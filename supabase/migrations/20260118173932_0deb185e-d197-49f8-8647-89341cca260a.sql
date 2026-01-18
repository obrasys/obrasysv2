-- =====================================================
-- MÓDULO FINANCEIRO - CRIAÇÃO DE TABELAS
-- =====================================================

-- 1. TABELA DE FORNECEDORES (criar primeiro)
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(50),
  endereco TEXT,
  nif VARCHAR(20),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. CONTAS FINANCEIRAS (Contas a pagar e receber)
CREATE TABLE public.contas_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  origem VARCHAR(20) NOT NULL CHECK (origem IN ('mao_de_obra', 'material', 'outros')),
  valor DECIMAL(15,2) NOT NULL,
  descricao TEXT,
  data_vencimento DATE NOT NULL,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_pagamento DATE,
  colaborador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  comprovante_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. RESUMO FINANCEIRO POR OBRA
CREATE TABLE public.financeiro_obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE UNIQUE,
  valor_contrato DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_faturado DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_recebido DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. AUDITORIA DE ACESSO FINANCEIRO
CREATE TABLE public.financial_access_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. ATRIBUIÇÕES DE PROJETO FINANCEIRO
CREATE TABLE public.financial_project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, obra_id)
);

-- =====================================================
-- HABILITAR RLS
-- =====================================================
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_project_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - FORNECEDORES
-- =====================================================
CREATE POLICY "Users can view their own suppliers"
ON public.fornecedores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suppliers"
ON public.fornecedores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
ON public.fornecedores FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
ON public.fornecedores FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - CONTAS FINANCEIRAS
-- =====================================================
CREATE POLICY "Users can view their own financial accounts"
ON public.contas_financeiras FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial accounts"
ON public.contas_financeiras FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial accounts"
ON public.contas_financeiras FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial accounts"
ON public.contas_financeiras FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - FINANCEIRO OBRAS
-- =====================================================
CREATE POLICY "Users can view financial summary for their obras"
ON public.financeiro_obras FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.obras
  WHERE obras.id = financeiro_obras.obra_id
  AND obras.user_id = auth.uid()
));

CREATE POLICY "Users can insert financial summary for their obras"
ON public.financeiro_obras FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.obras
  WHERE obras.id = obra_id
  AND obras.user_id = auth.uid()
));

CREATE POLICY "Users can update financial summary for their obras"
ON public.financeiro_obras FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.obras
  WHERE obras.id = financeiro_obras.obra_id
  AND obras.user_id = auth.uid()
));

CREATE POLICY "Users can delete financial summary for their obras"
ON public.financeiro_obras FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.obras
  WHERE obras.id = financeiro_obras.obra_id
  AND obras.user_id = auth.uid()
));

-- =====================================================
-- POLÍTICAS RLS - AUDITORIA FINANCEIRA
-- =====================================================
CREATE POLICY "Users can view their own audit logs"
ON public.financial_access_audit FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
ON public.financial_access_audit FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - ATRIBUIÇÕES DE PROJETO
-- =====================================================
CREATE POLICY "Users can view their assignments"
ON public.financial_project_assignments FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = granted_by);

CREATE POLICY "Users can grant access to their obras"
ON public.financial_project_assignments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.obras
  WHERE obras.id = obra_id
  AND obras.user_id = auth.uid()
));

CREATE POLICY "Users can revoke access they granted"
ON public.financial_project_assignments FOR DELETE
USING (auth.uid() = granted_by);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_financeiras_updated_at
BEFORE UPDATE ON public.contas_financeiras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financeiro_obras_updated_at
BEFORE UPDATE ON public.financeiro_obras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_fornecedores_user ON public.fornecedores(user_id);
CREATE INDEX idx_contas_financeiras_obra ON public.contas_financeiras(obra_id);
CREATE INDEX idx_contas_financeiras_user ON public.contas_financeiras(user_id);
CREATE INDEX idx_contas_financeiras_tipo ON public.contas_financeiras(tipo);
CREATE INDEX idx_contas_financeiras_vencimento ON public.contas_financeiras(data_vencimento);
CREATE INDEX idx_contas_financeiras_pago ON public.contas_financeiras(pago);
CREATE INDEX idx_financeiro_obras_obra ON public.financeiro_obras(obra_id);
CREATE INDEX idx_financial_audit_user ON public.financial_access_audit(user_id);
CREATE INDEX idx_financial_assignments_user ON public.financial_project_assignments(user_id);
CREATE INDEX idx_financial_assignments_obra ON public.financial_project_assignments(obra_id);

-- =====================================================
-- STORAGE BUCKET PARA COMPROVANTES
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para comprovantes
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);