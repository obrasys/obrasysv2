-- Criar tabela para utilizadores migrados do V1
CREATE TABLE public.migrated_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  empresa TEXT,
  nif TEXT,
  telefone TEXT,
  v1_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'email_enviado', 'migrado', 'erro')),
  email_sent_at TIMESTAMP WITH TIME ZONE,
  migrated_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_migrated_users_status ON public.migrated_users(status);
CREATE INDEX idx_migrated_users_email ON public.migrated_users(email);

-- Enable RLS
ALTER TABLE public.migrated_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerir (por enquanto qualquer utilizador autenticado)
CREATE POLICY "Authenticated users can view migrated_users"
ON public.migrated_users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert migrated_users"
ON public.migrated_users
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update migrated_users"
ON public.migrated_users
FOR UPDATE
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_migrated_users_updated_at
BEFORE UPDATE ON public.migrated_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para marcar como migrado quando utilizador se regista
CREATE OR REPLACE FUNCTION public.mark_user_as_migrated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.migrated_users
  SET 
    status = 'migrado',
    migrated_at = now()
  WHERE email = NEW.email
    AND status != 'migrado';
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_mark_migrated
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.mark_user_as_migrated();