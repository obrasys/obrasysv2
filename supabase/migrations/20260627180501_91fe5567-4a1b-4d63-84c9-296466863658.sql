
-- Restrict marketplace SELECT on supplier_profiles to organisations that have an
-- established link with the supplier. Browsing the full marketplace happens via
-- dedicated RPCs/views; the table policy no longer exposes any active supplier
-- to every authenticated user.
DROP POLICY IF EXISTS supplier_profiles_marketplace_read ON public.supplier_profiles;

CREATE POLICY supplier_profiles_linked_org_read
ON public.supplier_profiles
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.tenant_supplier_links tsl
    JOIN public.organization_members om
      ON om.organization_id = tsl.organization_id
    WHERE tsl.supplier_profile_id = supplier_profiles.id
      AND tsl.status = 'active'
      AND om.user_id = auth.uid()
  )
);
