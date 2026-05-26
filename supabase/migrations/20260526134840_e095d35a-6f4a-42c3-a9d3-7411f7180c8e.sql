-- 1) autos_medicao_assinaturas: allow org admins to delete
CREATE POLICY "Org admins can delete signatures in their autos"
ON public.autos_medicao_assinaturas
FOR DELETE
TO authenticated
USING (
  public.is_org_admin()
  AND EXISTS (
    SELECT 1 FROM public.autos_medicao a
    WHERE a.id = autos_medicao_assinaturas.auto_id
      AND a.user_id = ANY (public.get_org_member_ids())
  )
);

-- 2) orcamento_templates_essencial: remove public/anon SELECT
DROP POLICY IF EXISTS "Templates essenciais sao publicos" ON public.orcamento_templates_essencial;

-- 3) plan_placed_elements: scope to org members
DROP POLICY IF EXISTS "Users manage own placed elements" ON public.plan_placed_elements;

CREATE POLICY "Org members can view placed elements"
ON public.plan_placed_elements
FOR SELECT
TO authenticated
USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Users can insert their own placed elements"
ON public.plan_placed_elements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can update placed elements"
ON public.plan_placed_elements
FOR UPDATE
TO authenticated
USING (user_id = ANY (public.get_org_member_ids()))
WITH CHECK (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can delete placed elements"
ON public.plan_placed_elements
FOR DELETE
TO authenticated
USING (user_id = ANY (public.get_org_member_ids()));