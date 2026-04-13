
CREATE TABLE public.plan_placed_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_import_id UUID NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol_type_id TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  rotation DOUBLE PRECISION DEFAULT 0,
  scale DOUBLE PRECISION DEFAULT 1,
  quantity INTEGER DEFAULT 1,
  note TEXT,
  environment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_placed_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own placed elements"
  ON public.plan_placed_elements
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
