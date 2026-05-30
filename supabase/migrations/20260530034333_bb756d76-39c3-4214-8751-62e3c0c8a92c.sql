ALTER TABLE public.capitulos_orcamento
  ADD COLUMN IF NOT EXISTS desconto_pct numeric(6,2) NOT NULL DEFAULT 0;

ALTER TABLE public.capitulos_orcamento
  DROP CONSTRAINT IF EXISTS capitulos_orcamento_desconto_pct_check;

ALTER TABLE public.capitulos_orcamento
  ADD CONSTRAINT capitulos_orcamento_desconto_pct_check
  CHECK (desconto_pct >= 0 AND desconto_pct <= 100);