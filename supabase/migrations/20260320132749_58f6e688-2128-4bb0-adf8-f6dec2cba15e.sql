
-- Security definer function to check quote request ownership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_quote_request_owner(_quote_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_requests
    WHERE id = _quote_request_id AND builder_user_id = auth.uid()
  )
$$;

-- Security definer function to check if user is an invited supplier on a quote request
CREATE OR REPLACE FUNCTION public.is_quote_request_supplier(_quote_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_request_suppliers qrs
    JOIN public.supplier_profiles sp ON sp.id = qrs.supplier_id
    WHERE qrs.quote_request_id = _quote_request_id AND sp.user_id = auth.uid()
  )
$$;

-- Fix quote_requests policies
DROP POLICY IF EXISTS "quote_requests_supplier_select" ON public.quote_requests;
CREATE POLICY "quote_requests_supplier_select" ON public.quote_requests
  FOR SELECT TO authenticated
  USING (public.is_quote_request_supplier(id));

-- Fix quote_request_suppliers policies (remove recursion)
DROP POLICY IF EXISTS "quote_request_suppliers_builder_select" ON public.quote_request_suppliers;
CREATE POLICY "quote_request_suppliers_builder_select" ON public.quote_request_suppliers
  FOR SELECT TO authenticated
  USING (public.is_quote_request_owner(quote_request_id));

DROP POLICY IF EXISTS "quote_request_suppliers_builder_insert" ON public.quote_request_suppliers;
CREATE POLICY "quote_request_suppliers_builder_insert" ON public.quote_request_suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_quote_request_owner(quote_request_id));

-- Fix quote_request_categories policies (same recursion issue)
DROP POLICY IF EXISTS "quote_request_categories_builder_all" ON public.quote_request_categories;
CREATE POLICY "quote_request_categories_builder_all" ON public.quote_request_categories
  FOR ALL TO authenticated
  USING (public.is_quote_request_owner(quote_request_id))
  WITH CHECK (public.is_quote_request_owner(quote_request_id));

DROP POLICY IF EXISTS "quote_request_categories_supplier_select" ON public.quote_request_categories;
CREATE POLICY "quote_request_categories_supplier_select" ON public.quote_request_categories
  FOR SELECT TO authenticated
  USING (public.is_quote_request_supplier(quote_request_id));
