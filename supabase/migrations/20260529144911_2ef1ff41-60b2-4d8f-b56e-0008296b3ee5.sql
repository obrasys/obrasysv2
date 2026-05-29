-- Fix 1: Restrict autos_medicao_assinaturas INSERT to authenticated only
DROP POLICY IF EXISTS "Users can insert signatures for their autos" ON public.autos_medicao_assinaturas;
DROP POLICY IF EXISTS "Org members can insert signatures" ON public.autos_medicao_assinaturas;

CREATE POLICY "Org members can insert signatures"
ON public.autos_medicao_assinaturas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.autos_medicao am
    WHERE am.id = autos_medicao_assinaturas.auto_id
      AND am.user_id = ANY (public.get_org_member_ids())
  )
);

-- Fix 2: Align obra_progress_tracking INSERT/UPDATE/DELETE with org-wide model
DROP POLICY IF EXISTS "Users can insert progress for their obras" ON public.obra_progress_tracking;
DROP POLICY IF EXISTS "Users can update progress for their obras" ON public.obra_progress_tracking;
DROP POLICY IF EXISTS "Users can delete progress for their obras" ON public.obra_progress_tracking;
DROP POLICY IF EXISTS "Org members can insert obra progress" ON public.obra_progress_tracking;
DROP POLICY IF EXISTS "Org members can update obra progress" ON public.obra_progress_tracking;
DROP POLICY IF EXISTS "Org members can delete obra progress" ON public.obra_progress_tracking;

CREATE POLICY "Org members can insert obra progress"
ON public.obra_progress_tracking
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = obra_progress_tracking.obra_id
      AND o.user_id = ANY (public.get_org_member_ids())
  )
);

CREATE POLICY "Org members can update obra progress"
ON public.obra_progress_tracking
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = obra_progress_tracking.obra_id
      AND o.user_id = ANY (public.get_org_member_ids())
  )
);

CREATE POLICY "Org members can delete obra progress"
ON public.obra_progress_tracking
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = obra_progress_tracking.obra_id
      AND o.user_id = ANY (public.get_org_member_ids())
  )
);
