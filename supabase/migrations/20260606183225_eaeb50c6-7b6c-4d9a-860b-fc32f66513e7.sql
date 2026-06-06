DROP POLICY IF EXISTS "Approved raw prices are publicly readable" ON public.material_price_raw;
CREATE POLICY "Approved raw prices readable by authenticated"
ON public.material_price_raw
FOR SELECT
TO authenticated
USING ((status = 'aprovado') OR (auth.uid() = user_id) OR is_super_admin());
REVOKE SELECT ON public.material_price_raw FROM anon;