
ALTER TABLE public.installations_packages 
  ADD COLUMN IF NOT EXISTS has_bomba_calor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_termoacumulador boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_piso_radiante boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_paineis_solares boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equipamentos_extra jsonb DEFAULT '[]'::jsonb;
