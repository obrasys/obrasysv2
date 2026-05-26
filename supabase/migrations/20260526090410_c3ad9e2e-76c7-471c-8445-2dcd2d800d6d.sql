
-- 1. axia_budget_stats: require auth
DROP POLICY IF EXISTS "Anyone can read axia_budget_stats" ON public.axia_budget_stats;
CREATE POLICY "Authenticated users can read axia_budget_stats"
  ON public.axia_budget_stats FOR SELECT TO authenticated
  USING (true);

-- 2. axia_item_dictionary: require auth
DROP POLICY IF EXISTS "Anyone can read axia_item_dictionary" ON public.axia_item_dictionary;
CREATE POLICY "Authenticated users can read axia_item_dictionary"
  ON public.axia_item_dictionary FOR SELECT TO authenticated
  USING (true);

-- 3. failed_login_attempts: drop profiles.role-based policy
DROP POLICY IF EXISTS "Only admins can view failed login attempts" ON public.failed_login_attempts;

-- 4. price_audit_log: drop profiles.role-based policies
DROP POLICY IF EXISTS "Apenas admins veem auditoria" ON public.price_audit_log;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.price_audit_log;

-- 5. organization_members INSERT: require org admin or super admin
DROP POLICY IF EXISTS "Org owner/admin can insert members" ON public.organization_members;
CREATE POLICY "Org admins can insert members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND (public.is_org_admin() OR public.is_super_admin())
  );

-- 6. organization_members DELETE: require org admin or super admin
DROP POLICY IF EXISTS "Org owner can delete members" ON public.organization_members;
CREATE POLICY "Org admins can delete members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_org_id()
    AND (public.is_org_admin() OR public.is_super_admin())
  );

-- 7. autos-medicao storage: allow org members to read files uploaded by org teammates
CREATE POLICY "Org members can view auto attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'autos-medicao'
    AND ((storage.foldername(name))[1])::uuid = ANY (public.get_org_member_ids())
  );

-- 8. budget-documents: extend table + storage to org members
CREATE POLICY "Org members can view budget documents"
  ON public.budget_documents FOR SELECT TO authenticated
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can view budget documents storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'budget-documents'
    AND ((storage.foldername(name))[1])::uuid = ANY (public.get_org_member_ids())
  );
