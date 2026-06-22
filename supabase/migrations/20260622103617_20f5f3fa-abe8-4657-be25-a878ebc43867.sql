
-- Phase 1: Library tables for Zones, Areas, Service Types

-- 1. Zone library
CREATE TABLE IF NOT EXISTS public.org_zone_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  icone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_zone_library TO authenticated;
GRANT ALL ON public.org_zone_library TO service_role;
ALTER TABLE public.org_zone_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zone_lib_select" ON public.org_zone_library FOR SELECT TO authenticated USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "zone_lib_insert" ON public.org_zone_library FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "zone_lib_update" ON public.org_zone_library FOR UPDATE TO authenticated USING (organization_id = public.get_user_org_id(auth.uid())) WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "zone_lib_delete" ON public.org_zone_library FOR DELETE TO authenticated USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE INDEX idx_zone_lib_org ON public.org_zone_library(organization_id) WHERE ativo;

-- 2. Area library
CREATE TABLE IF NOT EXISTS public.org_area_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_area_library TO authenticated;
GRANT ALL ON public.org_area_library TO service_role;
ALTER TABLE public.org_area_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "area_lib_select" ON public.org_area_library FOR SELECT TO authenticated USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "area_lib_insert" ON public.org_area_library FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "area_lib_update" ON public.org_area_library FOR UPDATE TO authenticated USING (organization_id = public.get_user_org_id(auth.uid())) WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "area_lib_delete" ON public.org_area_library FOR DELETE TO authenticated USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE INDEX idx_area_lib_org ON public.org_area_library(organization_id) WHERE ativo;

-- 3. Zone -> Area defaults (N:N)
CREATE TABLE IF NOT EXISTS public.org_zone_area_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  zone_id UUID NOT NULL REFERENCES public.org_zone_library(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.org_area_library(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zone_id, area_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_zone_area_defaults TO authenticated;
GRANT ALL ON public.org_zone_area_defaults TO service_role;
ALTER TABLE public.org_zone_area_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zad_all" ON public.org_zone_area_defaults FOR ALL TO authenticated USING (organization_id = public.get_user_org_id(auth.uid())) WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE INDEX idx_zad_zone ON public.org_zone_area_defaults(zone_id);

-- 4. Service Type library
CREATE TABLE IF NOT EXISTS public.org_service_type_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_service_type_library TO authenticated;
GRANT ALL ON public.org_service_type_library TO service_role;
ALTER TABLE public.org_service_type_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stl_select" ON public.org_service_type_library FOR SELECT TO authenticated USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "stl_insert" ON public.org_service_type_library FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "stl_update" ON public.org_service_type_library FOR UPDATE TO authenticated USING (organization_id = public.get_user_org_id(auth.uid())) WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "stl_delete" ON public.org_service_type_library FOR DELETE TO authenticated USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE INDEX idx_stl_org ON public.org_service_type_library(organization_id) WHERE ativo;

-- 5. Area -> Service Type suggestions
CREATE TABLE IF NOT EXISTS public.org_service_type_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  area_id UUID NOT NULL REFERENCES public.org_area_library(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.org_service_type_library(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (area_id, service_type_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_service_type_suggestions TO authenticated;
GRANT ALL ON public.org_service_type_suggestions TO service_role;
ALTER TABLE public.org_service_type_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sts_all" ON public.org_service_type_suggestions FOR ALL TO authenticated USING (organization_id = public.get_user_org_id(auth.uid())) WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE INDEX idx_sts_area ON public.org_service_type_suggestions(area_id);

-- 6. Service Type -> Service suggestions (text)
CREATE TABLE IF NOT EXISTS public.org_service_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  service_type_id UUID NOT NULL REFERENCES public.org_service_type_library(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  unidade TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_service_suggestions TO authenticated;
GRANT ALL ON public.org_service_suggestions TO service_role;
ALTER TABLE public.org_service_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss_all" ON public.org_service_suggestions FOR ALL TO authenticated USING (organization_id = public.get_user_org_id(auth.uid())) WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE INDEX idx_ss_type ON public.org_service_suggestions(service_type_id);

-- 7. Additive columns on existing tables
ALTER TABLE public.artigos_orcamento
  ADD COLUMN IF NOT EXISTS service_type_id UUID NULL,
  ADD COLUMN IF NOT EXISTS service_type_name TEXT NULL;

ALTER TABLE public.budget_zones
  ADD COLUMN IF NOT EXISTS library_zone_id UUID NULL;

ALTER TABLE public.budget_areas
  ADD COLUMN IF NOT EXISTS library_area_id UUID NULL;

-- 8. updated_at triggers (reuse existing helper)
CREATE TRIGGER trg_zone_lib_updated BEFORE UPDATE ON public.org_zone_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_area_lib_updated BEFORE UPDATE ON public.org_area_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stl_updated BEFORE UPDATE ON public.org_service_type_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
