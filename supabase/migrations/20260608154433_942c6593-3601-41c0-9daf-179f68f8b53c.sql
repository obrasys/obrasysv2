
DROP POLICY IF EXISTS "Org members can create signatures in their autos" ON public.autos_medicao_assinaturas;
DROP POLICY IF EXISTS "Org members can update signatures in their autos" ON public.autos_medicao_assinaturas;
DROP POLICY IF EXISTS "Org members can view signatures of their autos" ON public.autos_medicao_assinaturas;

CREATE POLICY "Org members can view signatures of their autos"
ON public.autos_medicao_assinaturas
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_assinaturas.auto_id
    AND a.user_id = ANY (get_org_member_ids())
));

CREATE POLICY "Org members can update signatures in their autos"
ON public.autos_medicao_assinaturas
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_assinaturas.auto_id
    AND a.user_id = ANY (get_org_member_ids())
));
