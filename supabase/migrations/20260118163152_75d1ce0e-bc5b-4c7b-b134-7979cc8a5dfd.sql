-- =====================================================
-- CORREÇÃO DE VULNERABILIDADES DE SEGURANÇA
-- =====================================================

-- 1. FAILED_LOGIN_ATTEMPTS - Restringir INSERT apenas a processos autenticados
-- Remover política permissiva atual
DROP POLICY IF EXISTS "Allow insert for tracking failed logins" ON public.failed_login_attempts;

-- Criar política que só permite INSERT com service role (via edge functions)
-- Utilizadores normais não devem poder inserir diretamente
CREATE POLICY "Only service role can insert failed logins"
ON public.failed_login_attempts
FOR INSERT
WITH CHECK (false);

-- 2. MATERIAL_PRICE_REFERENCE - Restringir escrita apenas a service role
-- Remover política permissiva atual
DROP POLICY IF EXISTS "Service role full access reference" ON public.material_price_reference;

-- Manter leitura pública para referência de preços
CREATE POLICY "Reference prices are publicly readable"
ON public.material_price_reference
FOR SELECT
USING (true);

-- Apenas service role pode escrever (via edge functions/triggers)
-- Não criar política de INSERT/UPDATE/DELETE para utilizadores normais

-- 3. PRICE_AUDIT_LOG - Tornar append-only (só INSERT, sem UPDATE/DELETE)
-- Remover política permissiva atual
DROP POLICY IF EXISTS "Service role full access audit" ON public.price_audit_log;

-- Manter leitura para admins
CREATE POLICY "Admins can view audit logs"
ON public.price_audit_log
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role = 'admin'
));

-- Bloquear UPDATE e DELETE completamente para utilizadores
-- (service role ainda pode operar se necessário via edge functions)

-- 4. MATERIAL_CATEGORIES - Restringir escrita
DROP POLICY IF EXISTS "Service role full access categories" ON public.material_categories;

-- Manter leitura pública
CREATE POLICY "Categories are publicly readable"
ON public.material_categories
FOR SELECT
USING (true);

-- 5. MATERIALS - Restringir escrita
DROP POLICY IF EXISTS "Service role full access materials" ON public.materials;

-- Manter leitura pública para catálogo
CREATE POLICY "Materials catalog is publicly readable"
ON public.materials
FOR SELECT
USING (true);

-- 6. REGIONS - Restringir escrita
DROP POLICY IF EXISTS "Service role full access regions" ON public.regions;

-- A política de leitura já existe, não precisa criar

-- 7. PRICE_SOURCES - Restringir escrita
DROP POLICY IF EXISTS "Service role full access sources" ON public.price_sources;

-- A política de leitura já existe, não precisa criar

-- 8. MATERIAL_PRICE_RAW - Restringir escrita ao próprio utilizador
DROP POLICY IF EXISTS "Service role full access raw" ON public.material_price_raw;

-- Manter políticas existentes que restringem ao user_id
-- Adicionar leitura pública para preços aprovados
CREATE POLICY "Approved raw prices are publicly readable"
ON public.material_price_raw
FOR SELECT
USING (status = 'aprovado' OR auth.uid() = user_id);