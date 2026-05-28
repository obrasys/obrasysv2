
-- 1. Block direct INSERT on mfa_otp_codes (service_role bypasses RLS, so edge functions still work)
CREATE POLICY "no_direct_insert_otp"
  ON public.mfa_otp_codes
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

-- 2. Block direct INSERT on mfa_trusted_devices
CREATE POLICY "no_direct_insert_trusted_devices"
  ON public.mfa_trusted_devices
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

-- Also lock down UPDATE (only service_role / edge function should mutate)
CREATE POLICY "no_direct_update_otp"
  ON public.mfa_otp_codes
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "no_direct_update_trusted_devices"
  ON public.mfa_trusted_devices
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 3. Restrict supplier_invites INSERT to super admins only
DROP POLICY IF EXISTS "authenticated_users_can_insert_invites" ON public.supplier_invites;
