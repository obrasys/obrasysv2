
-- Remove the overly permissive anonymous SELECT policy
DROP POLICY IF EXISTS "supplier_invites_anon_select" ON public.supplier_invites;

-- No anonymous access needed - invite validation should use server-side edge functions with service role
