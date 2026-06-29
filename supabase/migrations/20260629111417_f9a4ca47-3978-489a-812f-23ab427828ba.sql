CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
        AND member_status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE user_id = auth.uid()
    );
$function$;