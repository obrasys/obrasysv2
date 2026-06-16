CREATE OR REPLACE FUNCTION public.get_org_member_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT ARRAY_AGG(om2.user_id)
     FROM organization_members om
     JOIN organization_members om2 ON om2.organization_id = om.organization_id
     WHERE om.user_id = auth.uid()
       AND om.member_status = 'active'
       AND om2.member_status = 'active'),
    ARRAY[auth.uid()]
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND member_status = 'active'
  )
$function$;