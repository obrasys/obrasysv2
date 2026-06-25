DROP POLICY IF EXISTS "MCE approvals updatable by assigned user or admin" ON public.mce_approvals;

CREATE POLICY "MCE approvals updatable by assigned user or admin"
ON public.mce_approvals
FOR UPDATE
USING (
  (organization_id = get_user_org_id())
  AND ((assigned_user_id = auth.uid()) OR is_super_admin())
)
WITH CHECK (
  (organization_id = get_user_org_id())
  AND ((assigned_user_id = auth.uid()) OR is_super_admin())
);