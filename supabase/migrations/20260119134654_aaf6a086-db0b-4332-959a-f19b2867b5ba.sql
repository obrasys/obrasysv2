-- Tornar as políticas mais restritivas (apenas admin pode gerir migração)
-- Por agora, vamos usar o papel do perfil para verificar admin

DROP POLICY IF EXISTS "Authenticated users can view migrated_users" ON public.migrated_users;
DROP POLICY IF EXISTS "Authenticated users can insert migrated_users" ON public.migrated_users;
DROP POLICY IF EXISTS "Authenticated users can update migrated_users" ON public.migrated_users;

-- Políticas baseadas no papel do utilizador
CREATE POLICY "Admins can view migrated_users"
ON public.migrated_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert migrated_users"
ON public.migrated_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update migrated_users"
ON public.migrated_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);