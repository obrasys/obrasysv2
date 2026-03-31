
-- Table for persisting user notification & app settings
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Email notifications
  email_rdos BOOLEAN NOT NULL DEFAULT true,
  email_orcamentos BOOLEAN NOT NULL DEFAULT true,
  email_alertas BOOLEAN NOT NULL DEFAULT true,
  email_relatorios BOOLEAN NOT NULL DEFAULT true,
  -- Push notifications
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  push_alertas BOOLEAN NOT NULL DEFAULT true,
  push_tarefas BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own settings
CREATE POLICY "Users can read own settings"
ON public.user_settings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
ON public.user_settings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
ON public.user_settings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
