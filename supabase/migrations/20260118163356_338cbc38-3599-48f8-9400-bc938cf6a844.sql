-- =====================================================
-- CORREÇÃO ADICIONAL DE SEGURANÇA
-- =====================================================

-- 1. FAILED_LOGIN_ATTEMPTS - Restringir SELECT apenas a admins
-- Bloquear leitura pública dos logs de tentativas falhadas
CREATE POLICY "Only admins can view failed login attempts"
ON public.failed_login_attempts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role = 'admin'
));