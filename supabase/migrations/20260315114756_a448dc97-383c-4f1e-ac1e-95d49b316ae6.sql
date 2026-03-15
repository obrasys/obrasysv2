
-- Fix 1: Update capitulos_orcamento RLS to use org-level access
DROP POLICY IF EXISTS "Users can view capitulos of their orcamentos" ON public.capitulos_orcamento;
DROP POLICY IF EXISTS "Users can create capitulos in their orcamentos" ON public.capitulos_orcamento;
DROP POLICY IF EXISTS "Users can update capitulos of their orcamentos" ON public.capitulos_orcamento;
DROP POLICY IF EXISTS "Users can delete capitulos of their orcamentos" ON public.capitulos_orcamento;

CREATE POLICY "Org members can view capitulos"
  ON public.capitulos_orcamento FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orcamentos o
    WHERE o.id = capitulos_orcamento.orcamento_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can create capitulos"
  ON public.capitulos_orcamento FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orcamentos o
    WHERE o.id = capitulos_orcamento.orcamento_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can update capitulos"
  ON public.capitulos_orcamento FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orcamentos o
    WHERE o.id = capitulos_orcamento.orcamento_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can delete capitulos"
  ON public.capitulos_orcamento FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orcamentos o
    WHERE o.id = capitulos_orcamento.orcamento_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

-- Fix 2: Update artigos_orcamento RLS to use org-level access
DROP POLICY IF EXISTS "Users can view artigos of their orcamentos" ON public.artigos_orcamento;
DROP POLICY IF EXISTS "Users can create artigos in their orcamentos" ON public.artigos_orcamento;
DROP POLICY IF EXISTS "Users can update artigos of their orcamentos" ON public.artigos_orcamento;
DROP POLICY IF EXISTS "Users can delete artigos of their orcamentos" ON public.artigos_orcamento;

CREATE POLICY "Org members can view artigos"
  ON public.artigos_orcamento FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM capitulos_orcamento c
    JOIN orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = artigos_orcamento.capitulo_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can create artigos"
  ON public.artigos_orcamento FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM capitulos_orcamento c
    JOIN orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = artigos_orcamento.capitulo_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can update artigos"
  ON public.artigos_orcamento FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM capitulos_orcamento c
    JOIN orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = artigos_orcamento.capitulo_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can delete artigos"
  ON public.artigos_orcamento FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM capitulos_orcamento c
    JOIN orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = artigos_orcamento.capitulo_id
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

-- Fix 3: Remove super admin bypass on orcamentos and clientes
DROP POLICY IF EXISTS "Super admins can view all orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Super admins can view all clientes" ON public.clientes;
