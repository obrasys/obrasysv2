
-- Recreate is_obra_owner as plpgsql to prevent SQL inlining (which defeats SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_obra_owner(_obra_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.obras
    WHERE id = _obra_id AND user_id = auth.uid()
  );
END;
$$;
