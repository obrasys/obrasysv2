
-- Remove super admin global SELECT policies from operational tables
-- Super admins will still see their own organization's data via org member policies

DROP POLICY IF EXISTS "Super admins can view all relatorios_diarios" ON public.relatorios_diarios;
DROP POLICY IF EXISTS "Super admins can view all financial accounts" ON public.contas_financeiras;
DROP POLICY IF EXISTS "Super admins can view all fornecedores" ON public.fornecedores;
