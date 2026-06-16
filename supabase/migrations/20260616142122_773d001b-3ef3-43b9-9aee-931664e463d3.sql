
ALTER TABLE public.artigos_orcamento
  ADD COLUMN IF NOT EXISTS supplier_pricebook_item_id uuid REFERENCES public.tenant_supplier_pricebook_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_pricebook_id uuid REFERENCES public.tenant_supplier_pricebooks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_pricebook_origin_price numeric;

CREATE INDEX IF NOT EXISTS idx_artigos_orcamento_supplier_pricebook_item
  ON public.artigos_orcamento(supplier_pricebook_item_id)
  WHERE supplier_pricebook_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artigos_orcamento_supplier_fornecedor
  ON public.artigos_orcamento(supplier_fornecedor_id)
  WHERE supplier_fornecedor_id IS NOT NULL;
