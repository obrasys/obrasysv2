-- ─────────────────────────────────────────────────────────
-- Fase 1: Triggers de sincronização valor_total
-- ─────────────────────────────────────────────────────────

-- 1. Função BEFORE INSERT/UPDATE em artigos: calcula valor_total
CREATE OR REPLACE FUNCTION public.calc_artigo_valor_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.valor_total := COALESCE(NEW.quantidade, 0) * COALESCE(NEW.preco_unitario, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_artigos_calc_valor_total ON public.artigos_orcamento;
CREATE TRIGGER trg_artigos_calc_valor_total
  BEFORE INSERT OR UPDATE OF quantidade, preco_unitario
  ON public.artigos_orcamento
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_artigo_valor_total();

-- 2. Trigger AFTER em artigos para sincronizar capitulo
DROP TRIGGER IF EXISTS trg_artigos_sync_capitulo ON public.artigos_orcamento;
CREATE TRIGGER trg_artigos_sync_capitulo
  AFTER INSERT OR UPDATE OR DELETE
  ON public.artigos_orcamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_capitulo_valor_total();

-- 3. Trigger AFTER em capitulos para sincronizar orcamento
DROP TRIGGER IF EXISTS trg_capitulos_sync_orcamento ON public.capitulos_orcamento;
CREATE TRIGGER trg_capitulos_sync_orcamento
  AFTER INSERT OR UPDATE OR DELETE
  ON public.capitulos_orcamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orcamento_valor_total();

-- ─────────────────────────────────────────────────────────
-- Fase 1: Reparação de orçamentos ICF antigos
-- (preco_unitario foi gravado com margem aplicada; restaurar custo)
-- ─────────────────────────────────────────────────────────
UPDATE public.artigos_orcamento
SET preco_unitario = preco_base
WHERE quantity_source = 'icf_parametric'
  AND preco_base IS NOT NULL
  AND preco_base > 0
  AND preco_base <> preco_unitario;

-- Forçar recálculo de valor_total + propagação aos capítulos/orçamentos
-- (o trigger BEFORE UPDATE já recalcula, mas garantimos cobertura para
--  artigos que não foram tocados acima)
UPDATE public.artigos_orcamento
SET quantidade = quantidade
WHERE quantity_source = 'icf_parametric';