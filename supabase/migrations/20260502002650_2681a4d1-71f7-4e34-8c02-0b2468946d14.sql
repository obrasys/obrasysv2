-- Adiciona segregação por "tipo_base" na Base de Preços (Geral vs Remodelação)

-- 1) Coluna tipo_base + tipo_linha em base_artigos_global
ALTER TABLE public.base_artigos_global 
  ADD COLUMN IF NOT EXISTS tipo_base TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS tipo_linha TEXT;

ALTER TABLE public.base_artigos_global 
  DROP CONSTRAINT IF EXISTS chk_base_global_tipo_base;
ALTER TABLE public.base_artigos_global 
  ADD CONSTRAINT chk_base_global_tipo_base CHECK (tipo_base IN ('geral','remodelacao'));

-- Remover unique antigo no codigo (se existir) e criar composto
ALTER TABLE public.base_artigos_global 
  DROP CONSTRAINT IF EXISTS base_artigos_global_codigo_key;
ALTER TABLE public.base_artigos_global 
  DROP CONSTRAINT IF EXISTS uniq_global_tipo_codigo;
ALTER TABLE public.base_artigos_global 
  ADD CONSTRAINT uniq_global_tipo_codigo UNIQUE (tipo_base, codigo);

CREATE INDEX IF NOT EXISTS idx_base_global_tipo ON public.base_artigos_global(tipo_base);

-- 2) Coluna tipo_base + tipo_linha em base_artigos_user
ALTER TABLE public.base_artigos_user 
  ADD COLUMN IF NOT EXISTS tipo_base TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS tipo_linha TEXT;

ALTER TABLE public.base_artigos_user 
  DROP CONSTRAINT IF EXISTS chk_base_user_tipo_base;
ALTER TABLE public.base_artigos_user 
  ADD CONSTRAINT chk_base_user_tipo_base CHECK (tipo_base IN ('geral','remodelacao'));

-- Atualizar unique para incluir tipo_base (permite mesmo codigo em bases diferentes para a mesma org)
ALTER TABLE public.base_artigos_user 
  DROP CONSTRAINT IF EXISTS base_artigos_user_organization_id_codigo_key;
ALTER TABLE public.base_artigos_user 
  DROP CONSTRAINT IF EXISTS uniq_user_org_tipo_codigo;
ALTER TABLE public.base_artigos_user 
  ADD CONSTRAINT uniq_user_org_tipo_codigo UNIQUE (organization_id, tipo_base, codigo);

CREATE INDEX IF NOT EXISTS idx_base_user_tipo ON public.base_artigos_user(user_id, tipo_base);