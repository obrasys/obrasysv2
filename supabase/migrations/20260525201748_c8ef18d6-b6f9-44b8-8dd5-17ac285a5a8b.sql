
-- =====================================================================
-- 1. Catálogo de Qualidades por organização
-- =====================================================================
CREATE TABLE public.org_quality_specs_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  spec_key text NOT NULL,
  label text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, spec_key)
);

CREATE INDEX idx_quality_specs_org ON public.org_quality_specs_catalog(organization_id, ordem);

ALTER TABLE public.org_quality_specs_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read quality specs"
ON public.org_quality_specs_catalog FOR SELECT
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org members insert quality specs"
ON public.org_quality_specs_catalog FOR INSERT
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org members update quality specs"
ON public.org_quality_specs_catalog FOR UPDATE
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org members delete quality specs"
ON public.org_quality_specs_catalog FOR DELETE
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE TRIGGER trg_quality_specs_updated
BEFORE UPDATE ON public.org_quality_specs_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 2. Mapa de Vendas Comercial (linhas dedicadas)
-- =====================================================================
CREATE TABLE public.closing_sheet_sales_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_sheet_id uuid NOT NULL REFERENCES public.closing_sheets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  tipologia text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  area_priv numeric(14,2) DEFAULT 0,
  preco_m2 numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_lines_sheet ON public.closing_sheet_sales_lines(closing_sheet_id, sort_order);

ALTER TABLE public.closing_sheet_sales_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read sales lines"
ON public.closing_sheet_sales_lines FOR SELECT
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org insert sales lines"
ON public.closing_sheet_sales_lines FOR INSERT
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org update sales lines"
ON public.closing_sheet_sales_lines FOR UPDATE
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org delete sales lines"
ON public.closing_sheet_sales_lines FOR DELETE
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE TRIGGER trg_sales_lines_updated
BEFORE UPDATE ON public.closing_sheet_sales_lines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 3. Discriminação de Gastos de Estaleiro
-- =====================================================================
CREATE TABLE public.closing_sheet_site_detail_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_sheet_id uuid NOT NULL REFERENCES public.closing_sheets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN
    ('site_labor','technical_staff','site_equipment','utilities','other_site_costs')),
  description text NOT NULL,
  useful_percent numeric(8,4) DEFAULT 1,
  quantity numeric(14,4) DEFAULT 1,
  months numeric(14,4) DEFAULT 1,
  monthly_cost numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) GENERATED ALWAYS AS
    (COALESCE(useful_percent,1) * COALESCE(quantity,1) * COALESCE(months,1) * COALESCE(monthly_cost,0)) STORED,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_detail_sheet ON public.closing_sheet_site_detail_lines(closing_sheet_id, category, sort_order);

ALTER TABLE public.closing_sheet_site_detail_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read site detail"
ON public.closing_sheet_site_detail_lines FOR SELECT
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org insert site detail"
ON public.closing_sheet_site_detail_lines FOR INSERT
WITH CHECK (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org update site detail"
ON public.closing_sheet_site_detail_lines FOR UPDATE
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org delete site detail"
ON public.closing_sheet_site_detail_lines FOR DELETE
USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE TRIGGER trg_site_detail_updated
BEFORE UPDATE ON public.closing_sheet_site_detail_lines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 4. Trigger: recalcular site_costs da closing_sheet
-- =====================================================================
CREATE OR REPLACE FUNCTION public.recalc_closing_sheet_site_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sheet_id uuid;
  v_total numeric;
BEGIN
  v_sheet_id := COALESCE(NEW.closing_sheet_id, OLD.closing_sheet_id);
  SELECT COALESCE(SUM(total_amount),0) INTO v_total
  FROM public.closing_sheet_site_detail_lines
  WHERE closing_sheet_id = v_sheet_id;

  UPDATE public.closing_sheets
  SET site_costs = v_total,
      updated_at = now()
  WHERE id = v_sheet_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_site_costs
AFTER INSERT OR UPDATE OR DELETE ON public.closing_sheet_site_detail_lines
FOR EACH ROW EXECUTE FUNCTION public.recalc_closing_sheet_site_costs();

-- =====================================================================
-- 5. Função seed do catálogo de qualidades (34 rúbricas Torres)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.seed_quality_specs_catalog(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_specs jsonb := '[
    {"k":"foundations","l":"Fundações"},
    {"k":"structure","l":"Estrutura"},
    {"k":"facades","l":"Fachadas"},
    {"k":"dry_flooring","l":"Pavimentos secos"},
    {"k":"wet_flooring","l":"Pavimentos húmidos"},
    {"k":"dry_walls","l":"Paredes secas"},
    {"k":"wet_walls","l":"Paredes húmidas"},
    {"k":"false_ceilings","l":"Tetos falsos"},
    {"k":"external_frames","l":"Caixilharias exteriores"},
    {"k":"solar_protection","l":"Proteção solar"},
    {"k":"iron_stainless_steel","l":"Serralharias ferro e inox"},
    {"k":"glass","l":"Vidros"},
    {"k":"carpentry","l":"Carpintarias"},
    {"k":"wardrobes","l":"Roupeiros"},
    {"k":"bathroom_furniture","l":"Móveis WC"},
    {"k":"kitchen_equipment","l":"Equipamentos de cozinha"},
    {"k":"sanitary_ware","l":"Louças sanitárias"},
    {"k":"taps","l":"Torneiras / misturadoras"},
    {"k":"waste_water","l":"Redes de águas residuais e pluviais"},
    {"k":"water_supply","l":"Rede abastecimento de águas / AQS"},
    {"k":"heating","l":"Aquecimento"},
    {"k":"avac","l":"Climatização / AVAC"},
    {"k":"fire_safety","l":"SCI"},
    {"k":"gas","l":"Gás"},
    {"k":"photovoltaic","l":"Painéis fotovoltaicos / solares"},
    {"k":"electrical_installations","l":"Instalações elétricas"},
    {"k":"ev_charging","l":"Posto carregamento veículos elétricos"},
    {"k":"alarm_cctv","l":"Alarme / videovigilância"},
    {"k":"domotics","l":"Domótica"},
    {"k":"central_vacuum","l":"Aspiração central"},
    {"k":"vmc","l":"VMC"},
    {"k":"basement_ventilation","l":"Ventilação caves"},
    {"k":"elevators","l":"Elevadores"},
    {"k":"painting","l":"Pinturas e vernizes"},
    {"k":"roofing","l":"Cobertura"},
    {"k":"external_works","l":"Arranjos exteriores"},
    {"k":"green_spaces","l":"Espaços verdes"},
    {"k":"garages","l":"Garagens"}
  ]'::jsonb;
  v_item jsonb;
  v_idx int := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_specs) LOOP
    INSERT INTO public.org_quality_specs_catalog (organization_id, spec_key, label, ordem)
    VALUES (p_org_id, v_item->>'k', v_item->>'l', v_idx)
    ON CONFLICT (organization_id, spec_key) DO NOTHING;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;
