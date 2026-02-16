-- Fix is_super_admin function to avoid querying auth.users (which causes infinite recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'email')::text IN ('"obrasys.pt@gmail.com"', '"riquebeze@gmail.com"', '"contacto@obrasys.pt"')
  );
END;
$$;