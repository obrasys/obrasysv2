-- Create function to check if user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) IN ('obrasys.pt@gmail.com', 'riquebeze@gmail.com', 'contacto@obrasys.pt');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add RLS policy for super admins to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all contas_financeiras
CREATE POLICY "Super admins can view all financial accounts"
ON public.contas_financeiras
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all obras
CREATE POLICY "Super admins can view all obras"
ON public.obras
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all orcamentos
CREATE POLICY "Super admins can view all orcamentos"
ON public.orcamentos
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all clientes
CREATE POLICY "Super admins can view all clientes"
ON public.clientes
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all relatorios_diarios
CREATE POLICY "Super admins can view all relatorios_diarios"
ON public.relatorios_diarios
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view failed login attempts
CREATE POLICY "Super admins can view all failed login attempts"
ON public.failed_login_attempts
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all fornecedores
CREATE POLICY "Super admins can view all fornecedores"
ON public.fornecedores
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all tarefas
CREATE POLICY "Super admins can view all tarefas"
ON public.tarefas
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view all categorias_financeiras
CREATE POLICY "Super admins can view all categorias_financeiras"
ON public.categorias_financeiras
FOR SELECT
USING (public.is_super_admin());

-- Add RLS policy for super admins to view price_audit_log
CREATE POLICY "Super admins can view all price_audit_log"
ON public.price_audit_log
FOR SELECT
USING (public.is_super_admin());