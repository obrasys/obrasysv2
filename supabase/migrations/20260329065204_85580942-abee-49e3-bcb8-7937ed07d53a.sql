-- Drop overly permissive super admin policies on resource tables
DROP POLICY IF EXISTS "Super admins can view all subempreiteiros" ON public.subempreiteiros;
DROP POLICY IF EXISTS "Super admins can view all equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Super admins can view all equipa_membros" ON public.equipa_membros;