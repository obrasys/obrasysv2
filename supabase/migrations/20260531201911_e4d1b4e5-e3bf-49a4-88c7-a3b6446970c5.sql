
REVOKE EXECUTE ON FUNCTION public.create_budget_working_version(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lock_budget_working_version(UUID) FROM PUBLIC, anon;
