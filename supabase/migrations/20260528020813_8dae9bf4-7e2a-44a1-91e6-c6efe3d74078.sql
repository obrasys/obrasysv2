-- Fix 1: axia_processing_logs — bloquear inserção de linhas órfãs (user_id NULL)
DROP POLICY IF EXISTS axia_logs_insert_self ON public.axia_processing_logs;
CREATE POLICY axia_logs_insert_self
ON public.axia_processing_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix 2: supplier_profiles — remover política de descoberta ampla
-- A leitura pública continua disponível via RPC get_public_supplier_profiles
-- (SECURITY DEFINER, expõe apenas colunas não-sensíveis).
DROP POLICY IF EXISTS supplier_profiles_active_discovery ON public.supplier_profiles;