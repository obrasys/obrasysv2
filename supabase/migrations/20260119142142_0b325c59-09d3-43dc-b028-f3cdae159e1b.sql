-- Fix search_path for is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) IN ('obrasys.pt@gmail.com', 'riquebeze@gmail.com', 'contacto@obrasys.pt');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;