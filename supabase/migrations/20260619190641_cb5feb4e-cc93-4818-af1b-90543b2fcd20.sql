
-- budget_versions
DROP POLICY IF EXISTS "Org members can insert budget versions" ON public.budget_versions;
CREATE POLICY "Org members can insert budget versions"
  ON public.budget_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- closing_sheets
DROP POLICY IF EXISTS "Org members can insert closing sheets" ON public.closing_sheets;
CREATE POLICY "Org members can insert closing sheets"
  ON public.closing_sheets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- rdo_material_requests
DROP POLICY IF EXISTS "Users can insert material requests" ON public.rdo_material_requests;
CREATE POLICY "Users can insert material requests"
  ON public.rdo_material_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- dashboard_alerts
DROP POLICY IF EXISTS "dashboard_alerts_insert_org" ON public.dashboard_alerts;
CREATE POLICY "dashboard_alerts_insert_org"
  ON public.dashboard_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- project_daily_plans: split ALL into per-cmd policies
DROP POLICY IF EXISTS "Users can manage own org daily plans" ON public.project_daily_plans;
CREATE POLICY "Org members can view daily plans"
  ON public.project_daily_plans FOR SELECT TO authenticated
  USING (user_id = ANY (get_org_member_ids()));
CREATE POLICY "Users can insert own daily plans"
  ON public.project_daily_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update daily plans"
  ON public.project_daily_plans FOR UPDATE TO authenticated
  USING (user_id = ANY (get_org_member_ids()))
  WITH CHECK (user_id = ANY (get_org_member_ids()));
CREATE POLICY "Org members can delete daily plans"
  ON public.project_daily_plans FOR DELETE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));

-- project_daily_plan_tasks
DROP POLICY IF EXISTS "Users can manage own org daily plan tasks" ON public.project_daily_plan_tasks;
CREATE POLICY "Org members can view daily plan tasks"
  ON public.project_daily_plan_tasks FOR SELECT TO authenticated
  USING (user_id = ANY (get_org_member_ids()));
CREATE POLICY "Users can insert own daily plan tasks"
  ON public.project_daily_plan_tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update daily plan tasks"
  ON public.project_daily_plan_tasks FOR UPDATE TO authenticated
  USING (user_id = ANY (get_org_member_ids()))
  WITH CHECK (user_id = ANY (get_org_member_ids()));
CREATE POLICY "Org members can delete daily plan tasks"
  ON public.project_daily_plan_tasks FOR DELETE TO authenticated
  USING (user_id = ANY (get_org_member_ids()));
