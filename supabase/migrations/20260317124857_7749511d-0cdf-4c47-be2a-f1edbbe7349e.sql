
ALTER TABLE public.parametric_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read system and own rules"
  ON public.parametric_rules
  FOR SELECT
  TO authenticated
  USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own rules"
  ON public.parametric_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update own rules"
  ON public.parametric_rules
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can delete own rules"
  ON public.parametric_rules
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = false);
