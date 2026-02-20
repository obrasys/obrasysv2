
-- ============================================================
-- PARTE 1: TABELAS BASE (sem políticas de referência cruzada)
-- ============================================================

-- 1. ENUMS
DO $$ BEGIN CREATE TYPE supplier_status_enum AS ENUM ('pending', 'active', 'suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quote_request_status_enum AS ENUM ('open', 'sent', 'in_review', 'closed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quote_supplier_status_enum AS ENUM ('invited', 'viewed', 'responded', 'declined', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quote_response_status_enum AS ENUM ('sent', 'accepted', 'rejected', 'withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pricebook_status_enum AS ENUM ('draft', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. SUPPLIER_CATEGORIES
CREATE TABLE IF NOT EXISTS public.supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_categories_select_authenticated" ON public.supplier_categories;
CREATE POLICY "supplier_categories_select_authenticated" ON public.supplier_categories FOR SELECT TO authenticated USING (true);

-- 3. SUPPLIER_PROFILES
CREATE TABLE IF NOT EXISTS public.supplier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL DEFAULT '',
  trade_name TEXT,
  service_areas TEXT,
  delivery_capability TEXT,
  sla_response_hours INT DEFAULT 48,
  min_order_value NUMERIC(12,2) DEFAULT 0,
  payment_terms TEXT,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  is_certified BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  status supplier_status_enum NOT NULL DEFAULT 'pending',
  location_district TEXT,
  location_municipality TEXT,
  phone TEXT,
  nif TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_profiles_own_select" ON public.supplier_profiles;
CREATE POLICY "supplier_profiles_own_select" ON public.supplier_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "supplier_profiles_builders_select" ON public.supplier_profiles;
CREATE POLICY "supplier_profiles_builders_select" ON public.supplier_profiles FOR SELECT TO authenticated USING (status = 'active');
DROP POLICY IF EXISTS "supplier_profiles_own_insert" ON public.supplier_profiles;
CREATE POLICY "supplier_profiles_own_insert" ON public.supplier_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "supplier_profiles_own_update" ON public.supplier_profiles;
CREATE POLICY "supplier_profiles_own_update" ON public.supplier_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. SUPPLIER_CATEGORY_LINK
CREATE TABLE IF NOT EXISTS public.supplier_category_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.supplier_categories(id) ON DELETE CASCADE,
  UNIQUE(supplier_id, category_id)
);
ALTER TABLE public.supplier_category_link ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_category_link_select" ON public.supplier_category_link;
CREATE POLICY "supplier_category_link_select" ON public.supplier_category_link FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "supplier_category_link_own_insert" ON public.supplier_category_link;
CREATE POLICY "supplier_category_link_own_insert" ON public.supplier_category_link FOR INSERT TO authenticated WITH CHECK (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "supplier_category_link_own_delete" ON public.supplier_category_link;
CREATE POLICY "supplier_category_link_own_delete" ON public.supplier_category_link FOR DELETE TO authenticated USING (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()));

-- 5. SUPPLIER_PRICEBOOKS
CREATE TABLE IF NOT EXISTS public.supplier_pricebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  valid_from DATE,
  valid_to DATE,
  status pricebook_status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_pricebooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_pricebooks_own_all" ON public.supplier_pricebooks;
CREATE POLICY "supplier_pricebooks_own_all" ON public.supplier_pricebooks FOR ALL TO authenticated USING (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid())) WITH CHECK (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()));

-- 6. SUPPLIER_PRICEBOOK_ITEMS
CREATE TABLE IF NOT EXISTS public.supplier_pricebook_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricebook_id UUID NOT NULL REFERENCES public.supplier_pricebooks(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.supplier_categories(id),
  item_code TEXT,
  item_name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'un',
  base_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 23,
  lead_time_days INT DEFAULT 1,
  min_qty NUMERIC(12,3) DEFAULT 1,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_pricebook_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_pricebook_items_own_all" ON public.supplier_pricebook_items;
CREATE POLICY "supplier_pricebook_items_own_all" ON public.supplier_pricebook_items FOR ALL TO authenticated
  USING (pricebook_id IN (SELECT pb.id FROM public.supplier_pricebooks pb JOIN public.supplier_profiles sp ON sp.id = pb.supplier_id WHERE sp.user_id = auth.uid()))
  WITH CHECK (pricebook_id IN (SELECT pb.id FROM public.supplier_pricebooks pb JOIN public.supplier_profiles sp ON sp.id = pb.supplier_id WHERE sp.user_id = auth.uid()));

-- 7. QUOTE_REQUESTS (builder policy only - no cross-table supplier policy yet)
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  location_district TEXT,
  location_municipality TEXT,
  requested_deadline DATE,
  status quote_request_status_enum NOT NULL DEFAULT 'open',
  message_to_suppliers TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_requests_builder_all" ON public.quote_requests;
CREATE POLICY "quote_requests_builder_all" ON public.quote_requests FOR ALL TO authenticated USING (builder_user_id = auth.uid()) WITH CHECK (builder_user_id = auth.uid());

-- 8. QUOTE_REQUEST_SUPPLIERS
CREATE TABLE IF NOT EXISTS public.quote_request_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  status quote_supplier_status_enum NOT NULL DEFAULT 'invited',
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quote_request_id, supplier_id)
);
ALTER TABLE public.quote_request_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_request_suppliers_builder_select" ON public.quote_request_suppliers;
CREATE POLICY "quote_request_suppliers_builder_select" ON public.quote_request_suppliers FOR SELECT TO authenticated USING (quote_request_id IN (SELECT id FROM public.quote_requests WHERE builder_user_id = auth.uid()));
DROP POLICY IF EXISTS "quote_request_suppliers_builder_insert" ON public.quote_request_suppliers;
CREATE POLICY "quote_request_suppliers_builder_insert" ON public.quote_request_suppliers FOR INSERT TO authenticated WITH CHECK (quote_request_id IN (SELECT id FROM public.quote_requests WHERE builder_user_id = auth.uid()));
DROP POLICY IF EXISTS "quote_request_suppliers_supplier_select" ON public.quote_request_suppliers;
CREATE POLICY "quote_request_suppliers_supplier_select" ON public.quote_request_suppliers FOR SELECT TO authenticated USING (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "quote_request_suppliers_supplier_update" ON public.quote_request_suppliers;
CREATE POLICY "quote_request_suppliers_supplier_update" ON public.quote_request_suppliers FOR UPDATE TO authenticated USING (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid())) WITH CHECK (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()));

-- NOW add the supplier policy on quote_requests (quote_request_suppliers exists now)
DROP POLICY IF EXISTS "quote_requests_supplier_select" ON public.quote_requests;
CREATE POLICY "quote_requests_supplier_select" ON public.quote_requests FOR SELECT TO authenticated
  USING (id IN (SELECT qrs.quote_request_id FROM public.quote_request_suppliers qrs JOIN public.supplier_profiles sp ON sp.id = qrs.supplier_id WHERE sp.user_id = auth.uid()));

-- 9. QUOTE_REQUEST_CATEGORIES (now quote_request_suppliers exists)
CREATE TABLE IF NOT EXISTS public.quote_request_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.supplier_categories(id),
  UNIQUE(quote_request_id, category_id)
);
ALTER TABLE public.quote_request_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_request_categories_builder_all" ON public.quote_request_categories;
CREATE POLICY "quote_request_categories_builder_all" ON public.quote_request_categories FOR ALL TO authenticated USING (quote_request_id IN (SELECT id FROM public.quote_requests WHERE builder_user_id = auth.uid())) WITH CHECK (quote_request_id IN (SELECT id FROM public.quote_requests WHERE builder_user_id = auth.uid()));
DROP POLICY IF EXISTS "quote_request_categories_supplier_select" ON public.quote_request_categories;
CREATE POLICY "quote_request_categories_supplier_select" ON public.quote_request_categories FOR SELECT TO authenticated USING (quote_request_id IN (SELECT qrs.quote_request_id FROM public.quote_request_suppliers qrs JOIN public.supplier_profiles sp ON sp.id = qrs.supplier_id WHERE sp.user_id = auth.uid()));

-- 10. QUOTE_RESPONSES
CREATE TABLE IF NOT EXISTS public.quote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  total_amount NUMERIC(14,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  estimated_delivery_days INT,
  notes TEXT,
  attachment_urls TEXT[],
  status quote_response_status_enum NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_responses_supplier_all" ON public.quote_responses;
CREATE POLICY "quote_responses_supplier_all" ON public.quote_responses FOR ALL TO authenticated USING (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid())) WITH CHECK (supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "quote_responses_builder_select" ON public.quote_responses;
CREATE POLICY "quote_responses_builder_select" ON public.quote_responses FOR SELECT TO authenticated USING (quote_request_id IN (SELECT id FROM public.quote_requests WHERE builder_user_id = auth.uid()));

-- 11. QUOTE_RESPONSE_ITEMS
CREATE TABLE IF NOT EXISTS public.quote_response_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_response_id UUID NOT NULL REFERENCES public.quote_responses(id) ON DELETE CASCADE,
  source_pricebook_item_id UUID REFERENCES public.supplier_pricebook_items(id),
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  qty NUMERIC(12,3) DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 23,
  line_total NUMERIC(14,2) DEFAULT 0,
  lead_time_days INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_response_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_response_items_supplier_all" ON public.quote_response_items;
CREATE POLICY "quote_response_items_supplier_all" ON public.quote_response_items FOR ALL TO authenticated
  USING (quote_response_id IN (SELECT qr.id FROM public.quote_responses qr JOIN public.supplier_profiles sp ON sp.id = qr.supplier_id WHERE sp.user_id = auth.uid()))
  WITH CHECK (quote_response_id IN (SELECT qr.id FROM public.quote_responses qr JOIN public.supplier_profiles sp ON sp.id = qr.supplier_id WHERE sp.user_id = auth.uid()));
DROP POLICY IF EXISTS "quote_response_items_builder_select" ON public.quote_response_items;
CREATE POLICY "quote_response_items_builder_select" ON public.quote_response_items FOR SELECT TO authenticated
  USING (quote_response_id IN (SELECT qr.id FROM public.quote_responses qr WHERE qr.quote_request_id IN (SELECT id FROM public.quote_requests WHERE builder_user_id = auth.uid())));

-- 12. SUPPLIER_INVITES
CREATE TABLE IF NOT EXISTS public.supplier_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by_admin_user_id UUID REFERENCES auth.users(id),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_invites_admin_all" ON public.supplier_invites;
CREATE POLICY "supplier_invites_admin_all" ON public.supplier_invites FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
DROP POLICY IF EXISTS "supplier_invites_anon_select" ON public.supplier_invites;
CREATE POLICY "supplier_invites_anon_select" ON public.supplier_invites FOR SELECT TO anon USING (true);

-- 13. TRIGGERS
CREATE OR REPLACE FUNCTION public.update_supplier_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN CREATE TRIGGER supplier_profiles_updated_at BEFORE UPDATE ON public.supplier_profiles FOR EACH ROW EXECUTE FUNCTION public.update_supplier_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER supplier_pricebooks_updated_at BEFORE UPDATE ON public.supplier_pricebooks FOR EACH ROW EXECUTE FUNCTION public.update_supplier_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER supplier_pricebook_items_updated_at BEFORE UPDATE ON public.supplier_pricebook_items FOR EACH ROW EXECUTE FUNCTION public.update_supplier_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER quote_requests_updated_at BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.update_supplier_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER quote_responses_updated_at BEFORE UPDATE ON public.quote_responses FOR EACH ROW EXECUTE FUNCTION public.update_supplier_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 14. SECURITY DEFINER FUNCTION
CREATE OR REPLACE FUNCTION public.is_supplier(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.supplier_profiles WHERE user_id = _user_id)
$$;

-- 15. SEED CATEGORIES
INSERT INTO public.supplier_categories (name, slug) VALUES
  ('Cerâmica e Pavimentos', 'ceramica-pavimentos'),
  ('Materiais de Construção', 'materiais-construcao'),
  ('Aço e Ferro', 'aco-ferro'),
  ('Betão e Pré-fabricados', 'betao-prefabricados'),
  ('Canalização e Águas', 'canalizacao-aguas'),
  ('Elétrica e Energias', 'eletrica-energias'),
  ('Pintura e Acabamentos', 'pintura-acabamentos'),
  ('Carpintaria e Madeiras', 'carpintaria-madeiras'),
  ('Alumínios e Vidros', 'aluminios-vidros'),
  ('Gesso Cartonado', 'gesso-cartonado'),
  ('Telecomunicações / ITED', 'telecom-ited'),
  ('Isolamentos e Impermeabilizações', 'isolamentos'),
  ('Equipamentos e Ferramentas', 'equipamentos-ferramentas'),
  ('Serralharia', 'serralharia'),
  ('Pré-fabricados e Módulos', 'prefabricados-modulos')
ON CONFLICT (slug) DO NOTHING;
