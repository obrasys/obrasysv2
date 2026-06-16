CREATE OR REPLACE FUNCTION public.is_quote_request_supplier(_quote_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_request_suppliers qrs
    JOIN public.supplier_profiles sp ON sp.id = qrs.supplier_id
    WHERE qrs.quote_request_id = _quote_request_id AND sp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.quote_requests qr
    JOIN public.tenant_supplier_links tsl
      ON tsl.fornecedor_id = qr.fornecedor_id
     AND tsl.organization_id = qr.organization_id
    JOIN public.supplier_profiles sp ON sp.id = tsl.supplier_profile_id
    WHERE qr.id = _quote_request_id
      AND qr.fornecedor_id IS NOT NULL
      AND sp.user_id = auth.uid()
      AND tsl.status = 'active'
  )
$function$;