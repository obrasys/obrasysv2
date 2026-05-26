-- Defense-in-depth: revoke column-level SELECT on PII from anon/authenticated.
-- Owner reads happen via SECURITY DEFINER RPC get_my_supplier_profile;
-- Super admin reads happen via admin_get_all_supplier_profiles.
REVOKE SELECT (
  nif,
  phone,
  telemovel,
  telefone_fixo,
  email_comercial,
  morada_completa,
  codigo_postal,
  responsavel_nome,
  payment_terms
) ON public.supplier_profiles FROM anon, authenticated;