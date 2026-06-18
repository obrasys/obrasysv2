
REVOKE EXECUTE ON FUNCTION public.handle_orcamento_adjudicado_lineage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_orcamento_adjudicado_lineage() TO service_role;
