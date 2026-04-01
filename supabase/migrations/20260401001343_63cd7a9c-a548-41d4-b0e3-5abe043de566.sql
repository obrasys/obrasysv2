
-- 1. Add columns to organization_members
ALTER TABLE public.organization_members 
  ADD COLUMN IF NOT EXISTS member_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS obra_scope text NOT NULL DEFAULT 'all';

-- 2. team_invitations
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  job_title text,
  internal_note text,
  role_code text NOT NULL DEFAULT 'gestor',
  obra_scope text NOT NULL DEFAULT 'all',
  invited_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: no duplicate pending invite for same email+org
CREATE UNIQUE INDEX team_invitations_unique_pending ON public.team_invitations (organization_id, email) WHERE status = 'pending';

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invitations" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Admins can manage invitations" ON public.team_invitations
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());

-- 3. team_invitation_module_permissions
CREATE TABLE public.team_invitation_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.team_invitations(id) ON DELETE CASCADE,
  module_code text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false
);

ALTER TABLE public.team_invitation_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invitation permissions" ON public.team_invitation_module_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.id = invitation_id AND ti.organization_id = public.get_user_org_id()
  ));

CREATE POLICY "Admins can manage invitation permissions" ON public.team_invitation_module_permissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.id = invitation_id AND ti.organization_id = public.get_user_org_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.id = invitation_id AND ti.organization_id = public.get_user_org_id()
  ));

-- 4. member_module_permissions
CREATE TABLE public.member_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  module_code text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE(member_id, module_code)
);

ALTER TABLE public.member_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view member permissions" ON public.member_module_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ));

CREATE POLICY "Admins can manage member permissions" ON public.member_module_permissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ));

-- 5. member_project_access
CREATE TABLE public.member_project_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'full',
  UNIQUE(member_id, obra_id)
);

ALTER TABLE public.member_project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view project access" ON public.member_project_access
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ));

CREATE POLICY "Admins can manage project access" ON public.member_project_access
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = member_id AND om.organization_id = public.get_user_org_id()
  ));
