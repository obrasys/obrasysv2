-- Allow clients to view payment plans for obras they have access to
CREATE POLICY "Clients can view payment plans for their obras"
ON public.budget_payment_plans
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.client_obra_access coa
    WHERE coa.obra_id = budget_payment_plans.obra_id
      AND coa.client_user_id = auth.uid()
      AND coa.ativo = true
  )
);