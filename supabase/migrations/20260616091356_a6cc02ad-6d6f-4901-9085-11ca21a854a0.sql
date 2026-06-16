CREATE OR REPLACE FUNCTION public.has_billing_permission(_perm text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.member_module_permissions p ON p.member_id = om.id
    WHERE om.user_id = auth.uid()
      AND om.member_status = 'active'
      AND p.module_code = 'billing.' || _perm
      AND p.can_view = true
  )
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.member_status = 'active'
      AND lower(om.role::text) IN ('fiscal','financeiro','finance','accounting','contabilidade')
  )
  OR public.is_org_admin();
$function$;