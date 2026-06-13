
-- parametric_rules: drop duplicate {public} policies
DROP POLICY IF EXISTS "Authenticated users can view parametric rules" ON public.parametric_rules;
DROP POLICY IF EXISTS "Users can view system rules and their own" ON public.parametric_rules;
DROP POLICY IF EXISTS "Users can delete their own rules" ON public.parametric_rules;
DROP POLICY IF EXISTS "Users can insert their own rules" ON public.parametric_rules;
DROP POLICY IF EXISTS "Users can update their own rules" ON public.parametric_rules;

-- icf_budget_chapter_templates: re-create policies scoped to authenticated
DROP POLICY IF EXISTS "Delete own templates" ON public.icf_budget_chapter_templates;
DROP POLICY IF EXISTS "Insert own templates" ON public.icf_budget_chapter_templates;
DROP POLICY IF EXISTS "Super admin manage global templates" ON public.icf_budget_chapter_templates;
DROP POLICY IF EXISTS "Update own templates" ON public.icf_budget_chapter_templates;
DROP POLICY IF EXISTS "View own or global templates" ON public.icf_budget_chapter_templates;

CREATE POLICY "View own or global templates" ON public.icf_budget_chapter_templates
  FOR SELECT TO authenticated
  USING ((is_global = true) OR (auth.uid() = user_id));
CREATE POLICY "Insert own templates" ON public.icf_budget_chapter_templates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own templates" ON public.icf_budget_chapter_templates
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) AND (is_global = false));
CREATE POLICY "Delete own templates" ON public.icf_budget_chapter_templates
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) AND (is_global = false));
CREATE POLICY "Super admin manage global templates" ON public.icf_budget_chapter_templates
  FOR ALL TO authenticated
  USING ((is_global = true) AND is_super_admin())
  WITH CHECK ((is_global = true) AND is_super_admin());

-- templates_capitulos: re-create policies scoped to authenticated
DROP POLICY IF EXISTS "Users can create their own templates" ON public.templates_capitulos;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates_capitulos;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates_capitulos;
DROP POLICY IF EXISTS "Users can view own templates and system templates" ON public.templates_capitulos;

CREATE POLICY "Users can view own templates and system templates" ON public.templates_capitulos
  FOR SELECT TO authenticated
  USING ((is_system = true) OR (auth.uid() = user_id));
CREATE POLICY "Users can create their own templates" ON public.templates_capitulos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.templates_capitulos
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) AND (is_system = false));
CREATE POLICY "Users can delete their own templates" ON public.templates_capitulos
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) AND (is_system = false));
