
-- Allow clients to read budget_awards for their assigned obras
CREATE POLICY "Clients can view budget_awards for their obras"
ON public.budget_awards
FOR SELECT
TO authenticated
USING (
  obra_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.client_obra_access coa
    WHERE coa.obra_id = budget_awards.obra_id
      AND coa.client_user_id = auth.uid()
      AND coa.ativo = true
  )
);
