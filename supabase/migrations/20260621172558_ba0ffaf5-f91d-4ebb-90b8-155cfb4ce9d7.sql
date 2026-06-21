
-- =========================================================================
-- FASE 1: Hierarquia Zona/Área para Orçamento Essencial
-- Aditivo. Não altera tabelas existentes (apenas adiciona colunas nullable).
-- =========================================================================

-- 1. Tabela budget_zones
CREATE TABLE IF NOT EXISTS public.budget_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  capitulo_id uuid NOT NULL REFERENCES public.capitulos_orcamento(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_zones TO authenticated;
GRANT ALL ON public.budget_zones TO service_role;

ALTER TABLE public.budget_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view zones" ON public.budget_zones
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_zones.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE POLICY "Org members can create zones" ON public.budget_zones
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_zones.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE POLICY "Org members can update zones" ON public.budget_zones
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_zones.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE POLICY "Org members can delete zones" ON public.budget_zones
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_zones.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE INDEX IF NOT EXISTS idx_budget_zones_orcamento ON public.budget_zones(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_budget_zones_capitulo ON public.budget_zones(capitulo_id);

-- 2. Tabela budget_areas
CREATE TABLE IF NOT EXISTS public.budget_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  capitulo_id uuid NOT NULL REFERENCES public.capitulos_orcamento(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.budget_zones(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_areas TO authenticated;
GRANT ALL ON public.budget_areas TO service_role;

ALTER TABLE public.budget_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view areas" ON public.budget_areas
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_areas.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE POLICY "Org members can create areas" ON public.budget_areas
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_areas.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE POLICY "Org members can update areas" ON public.budget_areas
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_areas.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE POLICY "Org members can delete areas" ON public.budget_areas
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.orcamentos o
    WHERE o.id = budget_areas.orcamento_id
      AND o.user_id = ANY (get_org_member_ids())
  ));

CREATE INDEX IF NOT EXISTS idx_budget_areas_orcamento ON public.budget_areas(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_budget_areas_capitulo ON public.budget_areas(capitulo_id);
CREATE INDEX IF NOT EXISTS idx_budget_areas_zone ON public.budget_areas(zone_id);

-- 3. Adicionar zone_id / area_id (opcionais) em artigos_orcamento
ALTER TABLE public.artigos_orcamento
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.budget_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.budget_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_artigos_orcamento_zone ON public.artigos_orcamento(zone_id);
CREATE INDEX IF NOT EXISTS idx_artigos_orcamento_area ON public.artigos_orcamento(area_id);

-- 4. Triggers de integridade hierárquica
-- 4a. budget_areas.capitulo_id = zone.capitulo_id
CREATE OR REPLACE FUNCTION public.validate_budget_area_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zone_capitulo uuid;
  v_zone_orc uuid;
BEGIN
  SELECT capitulo_id, orcamento_id INTO v_zone_capitulo, v_zone_orc
  FROM public.budget_zones WHERE id = NEW.zone_id;

  IF v_zone_capitulo IS NULL THEN
    RAISE EXCEPTION 'Zona % inexistente.', NEW.zone_id;
  END IF;
  IF v_zone_capitulo <> NEW.capitulo_id THEN
    RAISE EXCEPTION 'A área tem de pertencer ao mesmo capítulo da zona.';
  END IF;
  IF v_zone_orc <> NEW.orcamento_id THEN
    RAISE EXCEPTION 'Zona pertence a outro orçamento.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_budget_area_hierarchy ON public.budget_areas;
CREATE TRIGGER trg_validate_budget_area_hierarchy
  BEFORE INSERT OR UPDATE ON public.budget_areas
  FOR EACH ROW EXECUTE FUNCTION public.validate_budget_area_hierarchy();

-- 4b. artigos_orcamento: coerência capitulo / zone / area
CREATE OR REPLACE FUNCTION public.validate_artigo_zone_area()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zone_cap uuid;
  v_area_zone uuid;
  v_area_cap uuid;
BEGIN
  IF NEW.area_id IS NOT NULL AND NEW.zone_id IS NULL THEN
    RAISE EXCEPTION 'area_id requer zone_id preenchido.';
  END IF;

  IF NEW.zone_id IS NOT NULL THEN
    SELECT capitulo_id INTO v_zone_cap FROM public.budget_zones WHERE id = NEW.zone_id;
    IF v_zone_cap IS NULL THEN
      RAISE EXCEPTION 'Zona % inexistente.', NEW.zone_id;
    END IF;
    IF v_zone_cap <> NEW.capitulo_id THEN
      RAISE EXCEPTION 'A zona não pertence ao capítulo do artigo.';
    END IF;
  END IF;

  IF NEW.area_id IS NOT NULL THEN
    SELECT zone_id, capitulo_id INTO v_area_zone, v_area_cap
    FROM public.budget_areas WHERE id = NEW.area_id;
    IF v_area_zone IS NULL THEN
      RAISE EXCEPTION 'Área % inexistente.', NEW.area_id;
    END IF;
    IF v_area_zone <> NEW.zone_id THEN
      RAISE EXCEPTION 'A área não pertence à zona indicada.';
    END IF;
    IF v_area_cap <> NEW.capitulo_id THEN
      RAISE EXCEPTION 'A área não pertence ao capítulo do artigo.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_artigo_zone_area ON public.artigos_orcamento;
CREATE TRIGGER trg_validate_artigo_zone_area
  BEFORE INSERT OR UPDATE OF capitulo_id, zone_id, area_id ON public.artigos_orcamento
  FOR EACH ROW EXECUTE FUNCTION public.validate_artigo_zone_area();

-- 5. updated_at trigger
CREATE TRIGGER trg_budget_zones_updated_at
  BEFORE UPDATE ON public.budget_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_budget_areas_updated_at
  BEFORE UPDATE ON public.budget_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
