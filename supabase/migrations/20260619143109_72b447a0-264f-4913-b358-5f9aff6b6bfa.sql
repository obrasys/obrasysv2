
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND member_status = 'active'
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND member_status = 'active'
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
    AND member_status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
$function$;
