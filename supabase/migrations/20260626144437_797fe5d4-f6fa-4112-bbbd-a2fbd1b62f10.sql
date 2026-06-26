-- FASE 2 — Hardening: rate-limit Axia por organização

CREATE TABLE IF NOT EXISTS public.axia_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  module text NOT NULL,
  window_start timestamptz NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, module, window_start)
);

GRANT SELECT ON public.axia_rate_limits TO authenticated;
GRANT ALL ON public.axia_rate_limits TO service_role;

ALTER TABLE public.axia_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only members of the same organization can read their own rate-limit rows.
CREATE POLICY "axia_rate_limits_org_select"
ON public.axia_rate_limits
FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

-- Writes happen exclusively from edge functions via service_role; no INSERT/UPDATE/DELETE policy for authenticated.

CREATE INDEX IF NOT EXISTS ix_axia_rate_limits_org_module_window
  ON public.axia_rate_limits (organization_id, module, window_start DESC);

-- Atomic increment helper (service_role only). Returns the updated counter so
-- the edge function can decide whether to allow the call.
CREATE OR REPLACE FUNCTION public.axia_rate_limit_increment(
  _organization_id uuid,
  _user_id uuid,
  _module text,
  _window_start timestamptz,
  _max_calls integer
)
RETURNS TABLE (calls integer, allowed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calls integer;
BEGIN
  INSERT INTO public.axia_rate_limits (organization_id, user_id, module, window_start, calls)
  VALUES (_organization_id, _user_id, _module, _window_start, 1)
  ON CONFLICT (organization_id, module, window_start)
  DO UPDATE SET calls = public.axia_rate_limits.calls + 1,
                updated_at = now()
  RETURNING public.axia_rate_limits.calls INTO v_calls;

  RETURN QUERY SELECT v_calls, (v_calls <= _max_calls);
END;
$$;

REVOKE ALL ON FUNCTION public.axia_rate_limit_increment(uuid, uuid, text, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.axia_rate_limit_increment(uuid, uuid, text, timestamptz, integer) TO service_role;

-- Trigger to keep updated_at fresh.
CREATE TRIGGER trg_axia_rate_limits_updated_at
BEFORE UPDATE ON public.axia_rate_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();