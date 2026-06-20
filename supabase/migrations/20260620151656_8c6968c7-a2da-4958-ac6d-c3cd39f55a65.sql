
-- 0) Loosen the privilege-escalation guard:
--    Only block when an authenticated regular user tries to change THEIR OWN role.
--    Service role, system triggers and super admins continue to be able to sync roles.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL
       AND auth.uid() = NEW.user_id
       AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Não autorizado: apenas Super Admins podem alterar o seu próprio campo role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 1) Sync profiles.role from organization_members.role automatically
CREATE OR REPLACE FUNCTION public.sync_profile_role_from_org_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET role = NEW.role,
         updated_at = now()
   WHERE user_id = NEW.user_id
     AND (role IS DISTINCT FROM NEW.role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_role_from_org_member ON public.organization_members;
CREATE TRIGGER trg_sync_profile_role_from_org_member
AFTER INSERT OR UPDATE OF role ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_org_member();

-- Backfill: align existing profiles with their active org membership role
UPDATE public.profiles p
   SET role = om.role,
       updated_at = now()
  FROM public.organization_members om
 WHERE om.user_id = p.user_id
   AND om.member_status = 'active'
   AND p.role IS DISTINCT FROM om.role;

-- 2) RPC: mark the calling user's pending invitations as accepted.
--    Called by the client on SIGNED_IN so invites only move from "Pending"
--    to "Accepted" when the invited user truly logs in.
CREATE OR REPLACE FUNCTION public.accept_my_pending_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email   text;
  v_count   integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE public.team_invitations
       SET status = 'accepted',
           accepted_at = now(),
           accepted_by_user_id = v_user_id
     WHERE lower(email) = v_email
       AND status = 'pending'
     RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_my_pending_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_my_pending_invitations() TO authenticated;
