
-- 1. installations_packages
CREATE TABLE public.installations_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  specialty text NOT NULL CHECK (specialty IN ('electrical', 'plumbing', 'telecom')),
  profile text NOT NULL DEFAULT 'med' CHECK (profile IN ('eco', 'med', 'premium')),
  complexity text NOT NULL DEFAULT 'normal' CHECK (complexity IN ('simple', 'normal', 'complex')),
  typology text NOT NULL DEFAULT 'T3',
  area_m2 numeric NOT NULL DEFAULT 0,
  bathrooms integer NOT NULL DEFAULT 1,
  bedrooms integer NOT NULL DEFAULT 2,
  kitchen_count integer NOT NULL DEFAULT 1,
  extra_rooms integer NOT NULL DEFAULT 0,
  has_laundry boolean NOT NULL DEFAULT false,
  points_estimated integer NOT NULL DEFAULT 0,
  points_final integer,
  linear_m_estimated integer NOT NULL DEFAULT 0,
  linear_m_final integer,
  total_cost_estimated numeric NOT NULL DEFAULT 0,
  progress_percent numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'active')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.installations_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packages" ON public.installations_packages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own packages" ON public.installations_packages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own packages" ON public.installations_packages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own packages" ON public.installations_packages FOR DELETE USING (auth.uid() = user_id);

-- 2. installations_coefficients
CREATE TABLE public.installations_coefficients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  specialty text NOT NULL CHECK (specialty IN ('electrical', 'plumbing', 'telecom')),
  coefficient_key text NOT NULL,
  value_numeric numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, specialty, coefficient_key)
);

ALTER TABLE public.installations_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coefficients" ON public.installations_coefficients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own coefficients" ON public.installations_coefficients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coefficients" ON public.installations_coefficients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own coefficients" ON public.installations_coefficients FOR DELETE USING (auth.uid() = user_id);

-- 3. installations_catalog_items
CREATE TABLE public.installations_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  specialty text NOT NULL CHECK (specialty IN ('electrical', 'plumbing', 'telecom')),
  profile text NOT NULL DEFAULT 'med' CHECK (profile IN ('eco', 'med', 'premium')),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  base_qty_type text NOT NULL DEFAULT 'points' CHECK (base_qty_type IN ('points', 'linear', 'fixed')),
  cost_material numeric NOT NULL DEFAULT 0,
  cost_labor numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.installations_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system catalog items" ON public.installations_catalog_items FOR SELECT USING (is_system = true AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own catalog items" ON public.installations_catalog_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own catalog items" ON public.installations_catalog_items FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can update own catalog items" ON public.installations_catalog_items FOR UPDATE USING (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can delete own catalog items" ON public.installations_catalog_items FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- 4. installations_package_items
CREATE TABLE public.installations_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.installations_packages(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.installations_catalog_items(id),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  qty numeric NOT NULL DEFAULT 0,
  unit_cost_material numeric NOT NULL DEFAULT 0,
  unit_cost_labor numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  manually_adjusted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.installations_package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own package items" ON public.installations_package_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.installations_packages p WHERE p.id = installations_package_items.package_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can create own package items" ON public.installations_package_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.installations_packages p WHERE p.id = installations_package_items.package_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update own package items" ON public.installations_package_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.installations_packages p WHERE p.id = installations_package_items.package_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete own package items" ON public.installations_package_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.installations_packages p WHERE p.id = installations_package_items.package_id AND p.user_id = auth.uid()));

-- 5. installations_links
CREATE TABLE public.installations_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.installations_packages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  budget_id uuid REFERENCES public.orcamentos(id),
  budget_item_ids jsonb DEFAULT '[]'::jsonb,
  schedule_task_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.installations_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links" ON public.installations_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own links" ON public.installations_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own links" ON public.installations_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own links" ON public.installations_links FOR DELETE USING (auth.uid() = user_id);

-- 6. installations_logs
CREATE TABLE public.installations_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.installations_packages(id) ON DELETE CASCADE,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.installations_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.installations_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own logs" ON public.installations_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger for packages and coefficients
CREATE OR REPLACE FUNCTION public.update_installations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_installations_packages_updated_at
  BEFORE UPDATE ON public.installations_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_installations_updated_at();

CREATE TRIGGER update_installations_coefficients_updated_at
  BEFORE UPDATE ON public.installations_coefficients
  FOR EACH ROW EXECUTE FUNCTION public.update_installations_updated_at();

CREATE TRIGGER update_installations_catalog_items_updated_at
  BEFORE UPDATE ON public.installations_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_installations_updated_at();
