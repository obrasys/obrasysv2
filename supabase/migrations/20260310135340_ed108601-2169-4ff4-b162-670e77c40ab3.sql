
-- Update RLS for ai_budget_insights to be org-aware
DROP POLICY IF EXISTS "Users manage own insights" ON public.ai_budget_insights;
CREATE POLICY "Org members can view ai_budget_insights" ON public.ai_budget_insights FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can insert ai_budget_insights" ON public.ai_budget_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update ai_budget_insights" ON public.ai_budget_insights FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can delete ai_budget_insights" ON public.ai_budget_insights FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- Update RLS for ai_budget_actions_log to be org-aware
DROP POLICY IF EXISTS "Users read own action logs" ON public.ai_budget_actions_log;
DROP POLICY IF EXISTS "Users insert own action logs" ON public.ai_budget_actions_log;
CREATE POLICY "Org members can view ai_budget_actions_log" ON public.ai_budget_actions_log FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can insert ai_budget_actions_log" ON public.ai_budget_actions_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Update RLS for company_parametric_coefficients to be org-aware
DROP POLICY IF EXISTS "Users can view their own coefficients" ON public.company_parametric_coefficients;
DROP POLICY IF EXISTS "Users can delete their own coefficients" ON public.company_parametric_coefficients;
DROP POLICY IF EXISTS "Users can update their own coefficients" ON public.company_parametric_coefficients;
DROP POLICY IF EXISTS "Users can create their own coefficients" ON public.company_parametric_coefficients;
CREATE POLICY "Org members can view company_parametric_coefficients" ON public.company_parametric_coefficients FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can insert company_parametric_coefficients" ON public.company_parametric_coefficients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update company_parametric_coefficients" ON public.company_parametric_coefficients FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can delete company_parametric_coefficients" ON public.company_parametric_coefficients FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- Update RLS for caderno_validacao_historico to be org-aware
DROP POLICY IF EXISTS "Users can view own validation history" ON public.caderno_validacao_historico;
DROP POLICY IF EXISTS "Users can update own validation history" ON public.caderno_validacao_historico;
DROP POLICY IF EXISTS "Users can insert own validation history" ON public.caderno_validacao_historico;
CREATE POLICY "Org members can view caderno_validacao_historico" ON public.caderno_validacao_historico FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "Org members can insert caderno_validacao_historico" ON public.caderno_validacao_historico FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org members can update caderno_validacao_historico" ON public.caderno_validacao_historico FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
