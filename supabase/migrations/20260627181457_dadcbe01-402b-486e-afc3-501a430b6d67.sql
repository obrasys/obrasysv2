
-- 1. commercial_proposals: add INSERT and UPDATE policies
CREATE POLICY commercial_proposals_insert_org
ON public.commercial_proposals
FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY commercial_proposals_update_org
ON public.commercial_proposals
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND (created_by = auth.uid() OR public.is_org_admin())
)
WITH CHECK (
  organization_id = public.get_user_org_id()
  AND (created_by = auth.uid() OR public.is_org_admin())
);

-- 2. get_org_member_ids: drop unsafe fallback
CREATE OR REPLACE FUNCTION public.get_org_member_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT ARRAY_AGG(om2.user_id)
     FROM organization_members om
     JOIN organization_members om2 ON om2.organization_id = om.organization_id
     WHERE om.user_id = auth.uid()
       AND om.member_status = 'active'
       AND om2.member_status = 'active'),
    ARRAY[]::uuid[]
  )
$function$;

-- 3. supplier-pricelists: remove ambiguous org-path policies, add prefixed org policies
DROP POLICY IF EXISTS supplier_pricelists_org_select ON storage.objects;
DROP POLICY IF EXISTS supplier_pricelists_org_insert ON storage.objects;
DROP POLICY IF EXISTS supplier_pricelists_org_update ON storage.objects;
DROP POLICY IF EXISTS supplier_pricelists_org_delete ON storage.objects;

CREATE POLICY supplier_pricelists_orgs_prefix_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-pricelists'
  AND (storage.foldername(name))[1] = 'orgs'
  AND public.is_org_member(((storage.foldername(name))[2])::uuid)
);

CREATE POLICY supplier_pricelists_orgs_prefix_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-pricelists'
  AND (storage.foldername(name))[1] = 'orgs'
  AND public.is_org_member(((storage.foldername(name))[2])::uuid)
);

CREATE POLICY supplier_pricelists_orgs_prefix_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'supplier-pricelists'
  AND (storage.foldername(name))[1] = 'orgs'
  AND public.is_org_member(((storage.foldername(name))[2])::uuid)
)
WITH CHECK (
  bucket_id = 'supplier-pricelists'
  AND (storage.foldername(name))[1] = 'orgs'
  AND public.is_org_member(((storage.foldername(name))[2])::uuid)
);

CREATE POLICY supplier_pricelists_orgs_prefix_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-pricelists'
  AND (storage.foldername(name))[1] = 'orgs'
  AND public.is_org_member(((storage.foldername(name))[2])::uuid)
);
