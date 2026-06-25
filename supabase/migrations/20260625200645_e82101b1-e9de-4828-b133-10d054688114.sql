ALTER TABLE public.artigos_orcamento
  ADD COLUMN IF NOT EXISTS property_type_name TEXT;

CREATE INDEX IF NOT EXISTS idx_artigos_orcamento_property_type_name
  ON public.artigos_orcamento (property_type_name)
  WHERE property_type_name IS NOT NULL;