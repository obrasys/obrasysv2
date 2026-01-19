-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can view migrated_users" ON public.migrated_users;
DROP POLICY IF EXISTS "Admins can insert migrated_users" ON public.migrated_users;
DROP POLICY IF EXISTS "Admins can update migrated_users" ON public.migrated_users;

-- Criar novas políticas usando is_super_admin()
CREATE POLICY "Super admins can view migrated_users"
  ON public.migrated_users
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert migrated_users"
  ON public.migrated_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update migrated_users"
  ON public.migrated_users
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins can delete migrated_users"
  ON public.migrated_users
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());