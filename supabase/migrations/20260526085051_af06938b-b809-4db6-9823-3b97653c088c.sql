
-- 1. Tabela de definições MFA por utilizador
CREATE TABLE public.user_mfa_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_mfa_settings" ON public.user_mfa_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_mfa_settings" ON public.user_mfa_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Códigos OTP
CREATE TABLE public.mfa_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_otp_user_active ON public.mfa_otp_codes(user_id, consumed_at, expires_at);

ALTER TABLE public.mfa_otp_codes ENABLE ROW LEVEL SECURITY;
-- Apenas edge functions (service role) podem manipular códigos
CREATE POLICY "users_view_own_otp" ON public.mfa_otp_codes
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Dispositivos confiáveis
CREATE TABLE public.mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_trusted_user ON public.mfa_trusted_devices(user_id, expires_at);

ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_devices" ON public.mfa_trusted_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_devices" ON public.mfa_trusted_devices
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Função para validar token de dispositivo confiável
CREATE OR REPLACE FUNCTION public.is_trusted_device(p_token_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  IF p_token_hash IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.mfa_trusted_devices
  SET last_used_at = now()
  WHERE user_id = auth.uid()
    AND device_token_hash = p_token_hash
    AND expires_at > now()
  RETURNING true INTO v_valid;

  RETURN COALESCE(v_valid, false);
END;
$$;

-- 5. Função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_data()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.mfa_otp_codes WHERE created_at < now() - INTERVAL '1 hour';
  DELETE FROM public.mfa_trusted_devices WHERE expires_at < now();
$$;

-- 6. Trigger updated_at
CREATE TRIGGER trg_user_mfa_settings_updated_at
  BEFORE UPDATE ON public.user_mfa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Atualizar handle_new_user para criar mfa_settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
  v_created_by uuid;
  v_inviter_org_id uuid;
  v_role text;
  v_invitation record;
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, empresa_nome, empresa_nif, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'empresa', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'nif', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'telefone', '')), '')
  );

  -- Ativar MFA por defeito para todos os novos utilizadores
  INSERT INTO public.user_mfa_settings (user_id, enabled)
  VALUES (NEW.id, true)
  ON CONFLICT (user_id) DO NOTHING;

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestor');

  IF v_role = 'cliente' THEN
    RETURN NEW;
  END IF;

  v_created_by := (NEW.raw_user_meta_data->>'created_by')::uuid;

  IF v_created_by IS NOT NULL THEN
    SELECT organization_id INTO v_inviter_org_id
    FROM public.organization_members
    WHERE user_id = v_created_by
    LIMIT 1;

    IF v_inviter_org_id IS NOT NULL THEN
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (v_inviter_org_id, NEW.id, v_role)
      ON CONFLICT (organization_id, user_id) DO NOTHING;
      RETURN NEW;
    END IF;
  END IF;

  SELECT ti.organization_id, ti.role_code, ti.id, ti.invited_by_user_id, ti.obra_scope
  INTO v_invitation
  FROM public.team_invitations ti
  WHERE ti.email = NEW.email
    AND ti.status = 'pending'
    AND ti.expires_at > now()
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF v_invitation IS NOT NULL THEN
    v_role := CASE v_invitation.role_code
      WHEN 'admin' THEN 'admin'
      WHEN 'manager' THEN 'gestor'
      WHEN 'technician' THEN 'fiscal'
      WHEN 'finance' THEN 'financeiro'
      WHEN 'viewer' THEN 'gestor'
      ELSE 'gestor'
    END;

    UPDATE public.profiles SET role = v_role WHERE user_id = NEW.id;

    INSERT INTO public.organization_members (organization_id, user_id, role, member_status, invited_by, obra_scope)
    VALUES (v_invitation.organization_id, NEW.id, v_role, 'active', v_invitation.invited_by_user_id, COALESCE(v_invitation.obra_scope, 'all'))
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.team_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by_user_id = NEW.id
    WHERE id = v_invitation.id;

    INSERT INTO public.member_module_permissions (member_id, module_code, can_view, can_create, can_update, can_delete)
    SELECT om.id, tip.module_code, tip.can_view, tip.can_create, tip.can_update, tip.can_delete
    FROM public.organization_members om
    JOIN public.team_invitation_module_permissions tip ON tip.invitation_id = v_invitation.id
    WHERE om.user_id = NEW.id AND om.organization_id = v_invitation.organization_id;

    RETURN NEW;
  END IF;

  INSERT INTO public.organizations (nome, owner_user_id)
  VALUES (
    COALESCE(
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'empresa', '')), ''),
      COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)) || ' - Empresa'
    ),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$function$;

-- 8. Bootstrap: ativar MFA para todos os utilizadores existentes
INSERT INTO public.user_mfa_settings (user_id, enabled)
SELECT id, true FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
