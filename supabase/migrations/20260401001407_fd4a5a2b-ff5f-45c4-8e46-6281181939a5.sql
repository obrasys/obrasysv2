
-- Create helper function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
  )
$$;

-- Fix team_invitations: drop FOR ALL, add specific write policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.team_invitations;

CREATE POLICY "Admins can insert invitations" ON public.team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE POLICY "Admins can update invitations" ON public.team_invitations
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE POLICY "Admins can delete invitations" ON public.team_invitations
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- Fix team_invitation_module_permissions
DROP POLICY IF EXISTS "Admins can manage invitation permissions" ON public.team_invitation_module_permissions;

CREATE POLICY "Admins can insert invitation permissions" ON public.team_invitation_module_permissions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.id = invitation_id AND ti.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

CREATE POLICY "Admins can update invitation permissions" ON public.team_invitation_module_permissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.id = invitation_id AND ti.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

CREATE POLICY "Admins can delete invitation permissions" ON public.team_invitation_module_permissions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.id = invitation_id AND ti.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

-- Fix member_module_permissions
DROP POLICY IF EXISTS "Admins can manage member permissions" ON public.member_module_permissions;

CREATE POLICY "Admins can insert member permissions" ON public.member_module_permissions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

CREATE POLICY "Admins can update member permissions" ON public.member_module_permissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

CREATE POLICY "Admins can delete member permissions" ON public.member_module_permissions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

-- Fix member_project_access
DROP POLICY IF EXISTS "Admins can manage project access" ON public.member_project_access;

CREATE POLICY "Admins can insert project access" ON public.member_project_access
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

CREATE POLICY "Admins can update project access" ON public.member_project_access
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());

CREATE POLICY "Admins can delete project access" ON public.member_project_access
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ) AND public.is_org_admin());
