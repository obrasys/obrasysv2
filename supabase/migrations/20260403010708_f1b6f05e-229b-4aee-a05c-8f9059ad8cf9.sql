
DROP POLICY IF EXISTS "Authenticated users can insert own click tracking" ON public.email_click_tracking;

CREATE POLICY "Authenticated users can insert own click tracking"
ON public.email_click_tracking FOR INSERT
TO authenticated
WITH CHECK (email = auth.jwt()->>'email');
