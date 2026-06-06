
-- 1) Fix broken RLS policies that effectively allowed cross-org access
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'aftercare_records',
    'financial_source_links',
    'financial_work_documents',
    'financial_work_lines',
    'financial_work_cycles',
    'guarantee_retentions'
  ]) LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- aftercare_records
CREATE POLICY ar_select_org ON public.aftercare_records
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());
CREATE POLICY ar_insert_own ON public.aftercare_records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = public.get_user_org_id());
CREATE POLICY ar_update_org ON public.aftercare_records
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY ar_delete_org ON public.aftercare_records
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id());

-- financial_source_links
CREATE POLICY fsl_select_org ON public.financial_source_links
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());
CREATE POLICY fsl_insert_org ON public.financial_source_links
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY fsl_update_org ON public.financial_source_links
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY fsl_delete_org ON public.financial_source_links
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id());

-- financial_work_documents
CREATE POLICY fwd_select_org ON public.financial_work_documents
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());
CREATE POLICY fwd_insert_org ON public.financial_work_documents
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY fwd_update_org ON public.financial_work_documents
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY fwd_delete_org ON public.financial_work_documents
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id());

-- financial_work_lines
CREATE POLICY fwline_select_org ON public.financial_work_lines
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());
CREATE POLICY fwline_insert_org ON public.financial_work_lines
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY fwline_update_org ON public.financial_work_lines
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY fwline_delete_org ON public.financial_work_lines
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id());

-- financial_work_cycles
CREATE POLICY fwc_select_org ON public.financial_work_cycles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());
CREATE POLICY fwc_insert_own ON public.financial_work_cycles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = public.get_user_org_id());
CREATE POLICY fwc_update_org ON public.financial_work_cycles
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY fwc_delete_org ON public.financial_work_cycles
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id());

-- guarantee_retentions
CREATE POLICY gr_select_org ON public.guarantee_retentions
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());
CREATE POLICY gr_insert_org ON public.guarantee_retentions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY gr_update_org ON public.guarantee_retentions
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
CREATE POLICY gr_delete_org ON public.guarantee_retentions
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id());

-- 2) Pin search_path on trigger functions
ALTER FUNCTION public.prevent_locked_base_artigo_edit() SET search_path = public;
ALTER FUNCTION public.prevent_locked_base_chapter_edit() SET search_path = public;
ALTER FUNCTION public.prevent_locked_base_orcamento_edit() SET search_path = public;
