-- Add margin field to artigos_orcamento table
-- This field stores the profit margin percentage per article
-- The margin is applied on top of the base unit price
ALTER TABLE public.artigos_orcamento 
ADD COLUMN IF NOT EXISTS margem_lucro_artigo numeric DEFAULT 0;

-- Add base price field to store the original price before margin
ALTER TABLE public.artigos_orcamento 
ADD COLUMN IF NOT EXISTS preco_base numeric DEFAULT 0;

COMMENT ON COLUMN public.artigos_orcamento.margem_lucro_artigo IS 'Percentagem de margem de lucro do artigo (não visível ao cliente)';
COMMENT ON COLUMN public.artigos_orcamento.preco_base IS 'Preço base antes da margem de lucro';