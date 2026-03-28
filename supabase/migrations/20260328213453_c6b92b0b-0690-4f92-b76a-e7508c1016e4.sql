
-- Catálogo unificado de itens operacionais
CREATE TABLE public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'material' CHECK (item_type IN ('material', 'insumo', 'tool')),
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'un',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org catalog items" ON public.catalog_items
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert catalog items" ON public.catalog_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own org catalog items" ON public.catalog_items
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can delete own catalog items" ON public.catalog_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Destinação de recursos para obra
CREATE TABLE public.project_resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.catalog_items(id),
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'material' CHECK (item_type IN ('material', 'insumo', 'tool')),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'allocated', 'delivered', 'returned', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_resource_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org allocations" ON public.project_resource_allocations
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert allocations" ON public.project_resource_allocations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can update own org allocations" ON public.project_resource_allocations
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can delete own org allocations" ON public.project_resource_allocations
  FOR DELETE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- Necessidades operacionais lançadas na RDO
CREATE TABLE public.rdo_material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  rdo_id UUID REFERENCES public.relatorios_diarios(id) ON DELETE SET NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  needed_for_date DATE NOT NULL,
  item_id UUID REFERENCES public.catalog_items(id),
  free_text_item_name TEXT,
  item_type TEXT NOT NULL DEFAULT 'material' CHECK (item_type IN ('material', 'insumo', 'tool')),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'reviewed', 'allocated', 'delivered', 'cancelled')),
  allocation_id UUID REFERENCES public.project_resource_allocations(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rdo_material_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org material requests" ON public.rdo_material_requests
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert material requests" ON public.rdo_material_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can update own org material requests" ON public.rdo_material_requests
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can delete own org material requests" ON public.rdo_material_requests
  FOR DELETE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- Triggers for updated_at
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_resource_allocations_updated_at BEFORE UPDATE ON public.project_resource_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rdo_material_requests_updated_at BEFORE UPDATE ON public.rdo_material_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
