
CREATE TABLE public.email_click_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  token text,
  campaign text NOT NULL DEFAULT 'trial-expirado-winback',
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.email_click_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read click tracking"
  ON public.email_click_tracking
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Anyone can insert click tracking"
  ON public.email_click_tracking
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
