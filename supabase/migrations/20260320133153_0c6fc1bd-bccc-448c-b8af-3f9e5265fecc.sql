
-- Allow super admins to update supplier_profiles (for certification/approval)
CREATE POLICY "super_admin_update_supplier_profiles" ON public.supplier_profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
