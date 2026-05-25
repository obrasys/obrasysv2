ALTER TABLE public.closing_sheets
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.closing_sheets.details IS
  'Detalhe completo da Folha de Fecho (cabeçalho da obra, custos directos por categoria, estaleiro, terreno, indirectos, outros, administrativos, IVA, mapa de vendas comercial). Estrutura espelha o modelo em Excel "Folha de Fecho do Orçamento".';