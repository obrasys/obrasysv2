
DO $$ BEGIN
  CREATE TYPE public.cost_nature AS ENUM ('MO','MAT','SRV','INS','ALU','DIV');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('estrutura','obra')),
  parent_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE,
  location text,
  fiscal_year integer,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON public.cost_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_obra ON public.cost_centers(obra_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_type ON public.cost_centers(type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_centers TO authenticated;
GRANT ALL ON public.cost_centers TO service_role;

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read cost centers"
  ON public.cost_centers FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "org members insert cost centers"
  ON public.cost_centers FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "org members update cost centers"
  ON public.cost_centers FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "org admins delete cost centers"
  ON public.cost_centers FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE TRIGGER trg_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.next_obra_cost_center_code(_org_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_next integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'OB\.([0-9]+)') AS integer)), 0) + 1
  INTO v_next FROM public.cost_centers
  WHERE organization_id = _org_id AND type = 'obra' AND code ~ '^OB\.[0-9]+$';
  RETURN 'OB.' || LPAD(v_next::text, 3, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.handle_obra_create_cost_center()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org_id uuid; v_code text; v_name text; v_cc_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM public.organization_members
  WHERE user_id = NEW.user_id LIMIT 1;
  IF v_org_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.cost_center_id IS NOT NULL THEN RETURN NEW; END IF;

  v_code := public.next_obra_cost_center_code(v_org_id);
  v_name := COALESCE(NEW.nome, 'Obra') ||
            CASE WHEN NEW.endereco IS NOT NULL AND NEW.endereco <> ''
                 THEN ' — ' || NEW.endereco ELSE '' END;

  INSERT INTO public.cost_centers (organization_id, code, name, type, obra_id, location)
  VALUES (v_org_id, v_code, v_name, 'obra', NEW.id, NEW.endereco)
  RETURNING id INTO v_cc_id;

  UPDATE public.obras SET cost_center_id = v_cc_id WHERE id = NEW.id;
  RETURN NEW;
END; $$;

ALTER TABLE public.obras                ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.orcamentos           ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.artigos_orcamento    ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.artigos_orcamento    ADD COLUMN IF NOT EXISTS cost_nature public.cost_nature;
ALTER TABLE public.artigos_orcamento    ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.capitulos_orcamento  ADD COLUMN IF NOT EXISTS default_cost_nature public.cost_nature;
ALTER TABLE public.obra_purchases       ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.obra_purchases       ADD COLUMN IF NOT EXISTS cost_nature public.cost_nature;
ALTER TABLE public.budget_awards        ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.budget_awards        ADD COLUMN IF NOT EXISTS cost_nature public.cost_nature;
ALTER TABLE public.contracting_packages ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.contracting_packages ADD COLUMN IF NOT EXISTS cost_nature public.cost_nature;
ALTER TABLE public.budget_version_items ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.budget_version_items ADD COLUMN IF NOT EXISTS cost_nature public.cost_nature;
ALTER TABLE public.autos_medicao        ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.autos_medicao_itens  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.autos_medicao_itens  ADD COLUMN IF NOT EXISTS cost_nature public.cost_nature;
ALTER TABLE public.contas_financeiras   ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.contas_financeiras   ADD COLUMN IF NOT EXISTS cost_nature public.cost_nature;
ALTER TABLE public.contas_financeiras   ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.supplier_profiles    ADD COLUMN IF NOT EXISTS default_cost_nature public.cost_nature;

DROP TRIGGER IF EXISTS trg_obra_create_cost_center ON public.obras;
CREATE TRIGGER trg_obra_create_cost_center
  AFTER INSERT ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.handle_obra_create_cost_center();

CREATE OR REPLACE FUNCTION public.seed_default_estrutura_cost_centers(_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cost_centers (organization_id, code, name, type) VALUES
    (_org_id, 'CE.01', 'Gastos Gerais', 'estrutura'),
    (_org_id, 'CE.02', 'Staff / Enquadramento RH', 'estrutura'),
    (_org_id, 'CE.03', 'Outros Gastos', 'estrutura'),
    (_org_id, 'CE.04', 'Escritório', 'estrutura'),
    (_org_id, 'CE.05', 'Software / Serviços', 'estrutura'),
    (_org_id, 'CE.06', 'Viaturas', 'estrutura'),
    (_org_id, 'CE.07', 'Marketing / Comercial', 'estrutura'),
    (_org_id, 'CE.08', 'Contabilidade / Jurídico', 'estrutura')
  ON CONFLICT (organization_id, code) DO NOTHING;
END; $$;

DO $$
DECLARE
  v_org record; v_obra record; v_org_id uuid;
  v_code text; v_name text; v_cc_id uuid;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_estrutura_cost_centers(v_org.id);
  END LOOP;

  FOR v_obra IN
    SELECT o.id, o.nome, o.endereco, o.user_id
    FROM public.obras o
    WHERE o.cost_center_id IS NULL
    ORDER BY o.created_at ASC
  LOOP
    SELECT organization_id INTO v_org_id FROM public.organization_members
    WHERE user_id = v_obra.user_id LIMIT 1;
    IF v_org_id IS NULL THEN CONTINUE; END IF;

    v_code := public.next_obra_cost_center_code(v_org_id);
    v_name := COALESCE(v_obra.nome, 'Obra') ||
              CASE WHEN v_obra.endereco IS NOT NULL AND v_obra.endereco <> ''
                   THEN ' — ' || v_obra.endereco ELSE '' END;

    INSERT INTO public.cost_centers (organization_id, code, name, type, obra_id, location)
    VALUES (v_org_id, v_code, v_name, 'obra', v_obra.id, v_obra.endereco)
    RETURNING id INTO v_cc_id;

    UPDATE public.obras SET cost_center_id = v_cc_id WHERE id = v_obra.id;
  END LOOP;
END $$;
