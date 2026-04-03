-- Block direct INSERT on feedback_pesquisa for all users (inserts only via service role in edge function)
CREATE POLICY "Block direct insert for authenticated"
ON public.feedback_pesquisa FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block direct insert for anon"
ON public.feedback_pesquisa FOR INSERT
TO anon
WITH CHECK (false);