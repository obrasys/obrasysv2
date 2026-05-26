ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS area_atuacao text;
CREATE INDEX IF NOT EXISTS idx_fornecedores_area_atuacao ON public.fornecedores(area_atuacao);