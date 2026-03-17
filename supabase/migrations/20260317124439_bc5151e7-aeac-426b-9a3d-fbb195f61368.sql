
ALTER TABLE public.orcamento_templates_essencial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read templates"
  ON public.orcamento_templates_essencial
  FOR SELECT
  TO authenticated
  USING (true);
