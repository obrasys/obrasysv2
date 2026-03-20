
-- Allow any authenticated user to insert invites (they invite their own suppliers)
CREATE POLICY "authenticated_users_can_insert_invites"
  ON public.supplier_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (invited_by_admin_user_id = auth.uid());

-- Allow users to see their own invites
CREATE POLICY "users_can_read_own_invites"
  ON public.supplier_invites
  FOR SELECT
  TO authenticated
  USING (invited_by_admin_user_id = auth.uid() OR public.is_super_admin());
