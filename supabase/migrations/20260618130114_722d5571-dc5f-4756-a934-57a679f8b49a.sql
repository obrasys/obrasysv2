DROP POLICY IF EXISTS "MCE approvals insertable by org members" ON public.mce_approvals;
DROP POLICY IF EXISTS "MCE approvals insertable by approver or admin" ON public.mce_approvals;

CREATE POLICY "MCE approvals insertable by approver or admin"
ON public.mce_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.mce_maps m
    WHERE m.id = mce_approvals.mce_id
      AND m.organization_id = public.get_user_org_id(auth.uid())
  )
  AND (
    assigned_user_id = auth.uid()
    OR public.is_org_admin()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.mce_maps m
      WHERE m.id = mce_approvals.mce_id
        AND m.user_id = auth.uid()
    )
  )
);