
-- 1. Create helper function to check obra ownership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_obra_owner(_obra_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obras
    WHERE id = _obra_id AND user_id = auth.uid()
  );
$$;

-- 2. Drop the problematic policy that causes the circular reference
DROP POLICY IF EXISTS "Obra owners can manage client access" ON public.client_obra_access;

-- 3. Create separate policies using the helper function instead of direct query
CREATE POLICY "Obra owners can view client access"
ON public.client_obra_access
FOR SELECT
USING (public.is_obra_owner(obra_id) OR client_user_id = auth.uid());

CREATE POLICY "Obra owners can insert client access"
ON public.client_obra_access
FOR INSERT
WITH CHECK (public.is_obra_owner(obra_id));

CREATE POLICY "Obra owners can update client access"
ON public.client_obra_access
FOR UPDATE
USING (public.is_obra_owner(obra_id));

CREATE POLICY "Obra owners can delete client access"
ON public.client_obra_access
FOR DELETE
USING (public.is_obra_owner(obra_id));
