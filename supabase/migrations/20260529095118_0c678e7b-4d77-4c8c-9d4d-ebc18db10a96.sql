
-- ============================================================
-- MCE — Mapa Comparativo Económico (Fase 1)
-- ============================================================

CREATE TYPE public.mce_category AS ENUM ('SUB', 'SRV', 'MAT', 'MO', 'INS', 'ALU');
CREATE TYPE public.mce_status AS ENUM (
  'rascunho','em_consulta','propostas_recebidas','em_analise',
  'validacao_tecnica','validacao_financeira','em_aprovacao',
  'aprovado','adjudicado','em_execucao','fechado','cancelado'
);
CREATE TYPE public.mce_proposal_status AS ENUM (
  'pendente','recebida','incompleta','validada','excluida','selecionada'
);

-- ============================================================
-- mce_maps (cabeçalho)
-- ============================================================
CREATE TABLE public.mce_maps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  source_budget_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  budget_version_id uuid,
  budget_line_id uuid,
  cost_center_id uuid,
  mce_number text,
  work_number text,
  work_lot text,
  work_name text,
  work_location text,
  project_manager_id uuid,
  project_manager_name text,
  contractual_reference text,
  category public.mce_category,
  category_label text,
  title text NOT NULL DEFAULT 'Novo MCE',
  description text,
  dry_budget_total numeric NOT NULL DEFAULT 0,
  selected_supplier_id uuid,
  selected_supplier_total numeric NOT NULL DEFAULT 0,
  awarded_value numeric NOT NULL DEFAULT 0,
  gain_loss_value numeric NOT NULL DEFAULT 0,
  gain_loss_percentage numeric NOT NULL DEFAULT 0,
  status public.mce_status NOT NULL DEFAULT 'rascunho',
  technical_requirements text DEFAULT 'Pessoal credenciado para execução da empreitada. Cumprir especificações do Caderno de Encargos. Deverá apresentar os certificados de qualidade, produto/empresa fabricante, e/ou declaração de conformidade CE de todos os materiais e equipamentos utilizados.',
  observations text,
  axia_summary text,
  axia_alerts jsonb DEFAULT '[]'::jsonb,
  date_fornecimento date,
  date_contrato date,
  date_comparativo date DEFAULT CURRENT_DATE,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  awarded_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mce_maps_obra ON public.mce_maps(obra_id);
CREATE INDEX idx_mce_maps_org ON public.mce_maps(organization_id);
CREATE INDEX idx_mce_maps_budget ON public.mce_maps(source_budget_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_maps TO authenticated;
GRANT ALL ON public.mce_maps TO service_role;
ALTER TABLE public.mce_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mce_maps_select_org" ON public.mce_maps
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "mce_maps_insert_org" ON public.mce_maps
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = public.get_user_org_id());
CREATE POLICY "mce_maps_update_org" ON public.mce_maps
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "mce_maps_delete_org" ON public.mce_maps
  FOR DELETE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()) AND status IN ('rascunho','cancelado'));

CREATE TRIGGER trg_mce_maps_updated_at
  BEFORE UPDATE ON public.mce_maps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- mce_suppliers
-- ============================================================
CREATE TABLE public.mce_suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mce_id uuid NOT NULL REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  supplier_id uuid,
  position integer NOT NULL DEFAULT 0,
  supplier_name_snapshot text,
  contact_person text,
  phone text,
  email text,
  nif text,
  license_number text,
  payment_terms text,
  retention text,
  proposal_status public.mce_proposal_status NOT NULL DEFAULT 'pendente',
  proposal_total numeric NOT NULL DEFAULT 0,
  is_selected boolean NOT NULL DEFAULT false,
  selection_reason text,
  commercial_observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mce_suppliers_mce ON public.mce_suppliers(mce_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_suppliers TO authenticated;
GRANT ALL ON public.mce_suppliers TO service_role;
ALTER TABLE public.mce_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mce_suppliers_all" ON public.mce_suppliers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())));

CREATE TRIGGER trg_mce_suppliers_updated_at
  BEFORE UPDATE ON public.mce_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- mce_items (linhas da tabela comparativa)
-- ============================================================
CREATE TABLE public.mce_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mce_id uuid NOT NULL REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  budget_line_id uuid,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  specification text,
  dry_budget_quantity numeric NOT NULL DEFAULT 0,
  dry_budget_unit_price numeric NOT NULL DEFAULT 0,
  dry_budget_total numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  excluded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mce_items_mce ON public.mce_items(mce_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_items TO authenticated;
GRANT ALL ON public.mce_items TO service_role;
ALTER TABLE public.mce_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mce_items_all" ON public.mce_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())));

CREATE TRIGGER trg_mce_items_updated_at
  BEFORE UPDATE ON public.mce_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-calcular dry_budget_total
CREATE OR REPLACE FUNCTION public.mce_calc_item_dry_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.dry_budget_total := COALESCE(NEW.dry_budget_quantity,0) * COALESCE(NEW.dry_budget_unit_price,0);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mce_items_calc BEFORE INSERT OR UPDATE ON public.mce_items
  FOR EACH ROW EXECUTE FUNCTION public.mce_calc_item_dry_total();

-- ============================================================
-- mce_supplier_item_prices (preços por item × fornecedor)
-- ============================================================
CREATE TABLE public.mce_supplier_item_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mce_id uuid NOT NULL REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  mce_item_id uuid NOT NULL REFERENCES public.mce_items(id) ON DELETE CASCADE,
  mce_supplier_id uuid NOT NULL REFERENCES public.mce_suppliers(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mce_item_id, mce_supplier_id)
);

CREATE INDEX idx_mce_prices_mce ON public.mce_supplier_item_prices(mce_id);
CREATE INDEX idx_mce_prices_item ON public.mce_supplier_item_prices(mce_item_id);
CREATE INDEX idx_mce_prices_supplier ON public.mce_supplier_item_prices(mce_supplier_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_supplier_item_prices TO authenticated;
GRANT ALL ON public.mce_supplier_item_prices TO service_role;
ALTER TABLE public.mce_supplier_item_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mce_prices_all" ON public.mce_supplier_item_prices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())));

CREATE TRIGGER trg_mce_prices_updated_at
  BEFORE UPDATE ON public.mce_supplier_item_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-calcular total_price (quantity vem de mce_items)
CREATE OR REPLACE FUNCTION public.mce_calc_price_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_qty numeric;
BEGIN
  SELECT COALESCE(quantity,0) INTO v_qty FROM public.mce_items WHERE id = NEW.mce_item_id;
  NEW.total_price := COALESCE(NEW.unit_price,0) * COALESCE(v_qty,0);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mce_prices_calc BEFORE INSERT OR UPDATE ON public.mce_supplier_item_prices
  FOR EACH ROW EXECUTE FUNCTION public.mce_calc_price_total();

-- recalcular totais agregados sempre que algo muda
CREATE OR REPLACE FUNCTION public.mce_recalc_aggregates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mce_id uuid;
  v_dry numeric;
  v_sel_total numeric;
  v_sel_id uuid;
BEGIN
  v_mce_id := COALESCE(NEW.mce_id, OLD.mce_id);

  -- dry budget total
  SELECT COALESCE(SUM(dry_budget_total),0) INTO v_dry
  FROM public.mce_items WHERE mce_id = v_mce_id AND NOT excluded;

  -- recalcular proposal_total por fornecedor
  UPDATE public.mce_suppliers s
  SET proposal_total = COALESCE((
    SELECT SUM(p.total_price)
    FROM public.mce_supplier_item_prices p
    JOIN public.mce_items i ON i.id = p.mce_item_id
    WHERE p.mce_supplier_id = s.id AND NOT i.excluded
  ),0)
  WHERE s.mce_id = v_mce_id;

  -- selected supplier
  SELECT id, proposal_total INTO v_sel_id, v_sel_total
  FROM public.mce_suppliers
  WHERE mce_id = v_mce_id AND is_selected = true
  LIMIT 1;

  UPDATE public.mce_maps
  SET dry_budget_total = v_dry,
      selected_supplier_id = v_sel_id,
      selected_supplier_total = COALESCE(v_sel_total,0),
      awarded_value = COALESCE(v_sel_total,0),
      gain_loss_value = v_dry - COALESCE(v_sel_total,0),
      gain_loss_percentage = CASE WHEN v_dry > 0 THEN (v_dry - COALESCE(v_sel_total,0))/v_dry ELSE 0 END,
      updated_at = now()
  WHERE id = v_mce_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mce_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.mce_items
  FOR EACH ROW EXECUTE FUNCTION public.mce_recalc_aggregates();
CREATE TRIGGER trg_mce_prices_recalc AFTER INSERT OR UPDATE OR DELETE ON public.mce_supplier_item_prices
  FOR EACH ROW EXECUTE FUNCTION public.mce_recalc_aggregates();
CREATE TRIGGER trg_mce_suppliers_recalc AFTER INSERT OR UPDATE OR DELETE ON public.mce_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.mce_recalc_aggregates();

-- ============================================================
-- mce_attachments
-- ============================================================
CREATE TABLE public.mce_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mce_id uuid NOT NULL REFERENCES public.mce_maps(id) ON DELETE CASCADE,
  mce_supplier_id uuid REFERENCES public.mce_suppliers(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  attachment_type text DEFAULT 'proposal',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mce_attachments_mce ON public.mce_attachments(mce_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mce_attachments TO authenticated;
GRANT ALL ON public.mce_attachments TO service_role;
ALTER TABLE public.mce_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mce_attachments_all" ON public.mce_attachments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mce_maps m WHERE m.id = mce_id AND m.user_id = ANY(public.get_org_member_ids())));

-- ============================================================
-- Numeração automática do MCE (sequencial por obra)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mce_assign_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_next int;
BEGIN
  IF NEW.mce_number IS NULL OR NEW.mce_number = '' THEN
    SELECT COALESCE(MAX(CAST(NULLIF(mce_number,'') AS int)),0)+1
    INTO v_next FROM public.mce_maps WHERE obra_id = NEW.obra_id
      AND mce_number ~ '^[0-9]+$';
    NEW.mce_number := LPAD(v_next::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mce_assign_number BEFORE INSERT ON public.mce_maps
  FOR EACH ROW EXECUTE FUNCTION public.mce_assign_number();

-- ============================================================
-- Storage bucket privado
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('mce-attachments', 'mce-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "mce_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'mce-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "mce_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mce-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "mce_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'mce-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "mce_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'mce-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
