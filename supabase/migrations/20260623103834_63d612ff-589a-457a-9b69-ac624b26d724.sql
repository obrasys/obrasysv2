
-- 1) Deterministic org resolution
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND member_status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
$function$;

-- 2) Defense-in-depth: re-revoke sensitive PII columns from anon/authenticated
REVOKE SELECT (nif, morada_completa, codigo_postal, phone, telemovel, telefone_fixo, email_comercial, responsavel_nome, payment_terms, prazo_pagamento_padrao, default_cost_nature)
  ON public.supplier_profiles FROM authenticated, anon;

COMMENT ON POLICY supplier_profiles_active_marketplace_read ON public.supplier_profiles IS
'Marketplace discovery only. Sensitive PII columns (nif, morada_completa, codigo_postal, phone, telemovel, telefone_fixo, email_comercial, responsavel_nome, payment terms) are revoked at the column level from anon/authenticated. Owners read full profile via get_my_supplier_profile(); super admins via admin_get_all_supplier_profiles().';
