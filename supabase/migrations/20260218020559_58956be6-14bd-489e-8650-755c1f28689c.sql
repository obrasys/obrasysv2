
-- Add deny-all policy for survey_tokens (only service role can access it via edge functions)
-- This explicitly documents the intent: no client-side access
CREATE POLICY "No client access to survey_tokens"
  ON public.survey_tokens
  FOR ALL
  USING (false);
