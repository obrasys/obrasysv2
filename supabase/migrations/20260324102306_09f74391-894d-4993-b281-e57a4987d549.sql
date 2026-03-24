
-- Table to store budget items sent with a quote request (prices hidden from suppliers)
CREATE TABLE public.quote_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  artigo_orcamento_id UUID REFERENCES public.artigos_orcamento(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC NOT NULL DEFAULT 1,
  codigo TEXT,
  capitulo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;

-- Builder (owner) can see their own quote request items
CREATE POLICY "Builder can view own quote request items"
  ON public.quote_request_items FOR SELECT
  TO authenticated
  USING (public.is_quote_request_owner(quote_request_id));

-- Builder can insert items into their own quote requests
CREATE POLICY "Builder can insert own quote request items"
  ON public.quote_request_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_quote_request_owner(quote_request_id));

-- Supplier assigned to the quote request can view items
CREATE POLICY "Supplier can view assigned quote request items"
  ON public.quote_request_items FOR SELECT
  TO authenticated
  USING (public.is_quote_request_supplier(quote_request_id));
