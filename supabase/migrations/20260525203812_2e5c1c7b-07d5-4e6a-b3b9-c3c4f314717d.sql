
-- Align autos_medicao sub-table RLS with org-level isolation (get_org_member_ids)

-- ITENS
DROP POLICY IF EXISTS "Users can view items of their autos" ON public.autos_medicao_itens;
DROP POLICY IF EXISTS "Users can create items in their autos" ON public.autos_medicao_itens;
DROP POLICY IF EXISTS "Users can update items in their autos" ON public.autos_medicao_itens;
DROP POLICY IF EXISTS "Users can delete items from their autos" ON public.autos_medicao_itens;

CREATE POLICY "Org members can view items of their autos"
ON public.autos_medicao_itens FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_itens.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can create items in their autos"
ON public.autos_medicao_itens FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_itens.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can update items in their autos"
ON public.autos_medicao_itens FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_itens.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can delete items from their autos"
ON public.autos_medicao_itens FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_itens.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));

-- ASSINATURAS
DROP POLICY IF EXISTS "Users can view signatures of their autos" ON public.autos_medicao_assinaturas;
DROP POLICY IF EXISTS "Users can create signatures in their autos" ON public.autos_medicao_assinaturas;
DROP POLICY IF EXISTS "Users can update signatures in their autos" ON public.autos_medicao_assinaturas;

CREATE POLICY "Org members can view signatures of their autos"
ON public.autos_medicao_assinaturas FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_assinaturas.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can create signatures in their autos"
ON public.autos_medicao_assinaturas FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_assinaturas.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can update signatures in their autos"
ON public.autos_medicao_assinaturas FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_assinaturas.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));

-- ANEXOS
DROP POLICY IF EXISTS "Users can view attachments of their autos" ON public.autos_medicao_anexos;
DROP POLICY IF EXISTS "Users can create attachments in their autos" ON public.autos_medicao_anexos;
DROP POLICY IF EXISTS "Users can delete attachments from their autos" ON public.autos_medicao_anexos;

CREATE POLICY "Org members can view attachments of their autos"
ON public.autos_medicao_anexos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_anexos.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can create attachments in their autos"
ON public.autos_medicao_anexos FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_anexos.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can delete attachments from their autos"
ON public.autos_medicao_anexos FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_anexos.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));

-- HISTORICO
DROP POLICY IF EXISTS "Users can view history of their autos" ON public.autos_medicao_historico;
DROP POLICY IF EXISTS "Users can create history entries for their autos" ON public.autos_medicao_historico;

CREATE POLICY "Org members can view history of their autos"
ON public.autos_medicao_historico FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_historico.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
CREATE POLICY "Org members can create history entries for their autos"
ON public.autos_medicao_historico FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.autos_medicao a
  WHERE a.id = autos_medicao_historico.auto_id
    AND a.user_id = ANY (public.get_org_member_ids())
));
