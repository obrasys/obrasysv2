-- 1) Tabela mfa_sessions
CREATE TABLE IF NOT EXISTS public.mfa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jti text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  ip text
);

CREATE INDEX IF NOT EXISTS mfa_sessions_user_active_idx
  ON public.mfa_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

GRANT SELECT, DELETE ON public.mfa_sessions TO authenticated;
GRANT ALL ON public.mfa_sessions TO service_role;

ALTER TABLE public.mfa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mfa_sessions_select_own" ON public.mfa_sessions;
CREATE POLICY "mfa_sessions_select_own"
  ON public.mfa_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "mfa_sessions_delete_own" ON public.mfa_sessions;
CREATE POLICY "mfa_sessions_delete_own"
  ON public.mfa_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 2) RPC: estado atual
CREATE OR REPLACE FUNCTION public.mfa_is_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mfa_sessions
    WHERE user_id = auth.uid()
      AND revoked_at IS NULL
      AND expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.mfa_is_verified() TO authenticated;

-- 3) RPC: marcar sessão MFA (chamada pela edge function com service_role)
CREATE OR REPLACE FUNCTION public.mfa_mark_verified(
  p_user_id uuid,
  p_ttl_seconds integer DEFAULT 43200,
  p_user_agent text DEFAULT NULL,
  p_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.mfa_sessions (user_id, expires_at, user_agent, ip)
  VALUES (p_user_id, now() + make_interval(secs => GREATEST(p_ttl_seconds, 60)), p_user_agent, p_ip)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mfa_mark_verified(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mfa_mark_verified(uuid, integer, text, text) TO service_role;

-- 4) RPC: revogar sessões do próprio utilizador
CREATE OR REPLACE FUNCTION public.mfa_revoke_my_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.mfa_sessions
    SET revoked_at = now()
    WHERE user_id = auth.uid() AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mfa_revoke_my_sessions() TO authenticated;