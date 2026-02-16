
-- Create user engagement status table
CREATE TABLE public.user_engagement_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  has_created_project boolean NOT NULL DEFAULT false,
  has_created_budget boolean NOT NULL DEFAULT false,
  total_records_created integer NOT NULL DEFAULT 0,
  last_login_date timestamptz,
  last_action_date timestamptz,
  message_last_shown timestamptz,
  message_dismissed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_engagement_user ON public.user_engagement_status (user_id);

-- Enable RLS
ALTER TABLE public.user_engagement_status ENABLE ROW LEVEL SECURITY;

-- Users can view own status
CREATE POLICY "Users can view own engagement" 
ON public.user_engagement_status FOR SELECT 
USING (user_id = auth.uid());

-- Users can insert own status
CREATE POLICY "Users can insert own engagement" 
ON public.user_engagement_status FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Users can update own status
CREATE POLICY "Users can update own engagement" 
ON public.user_engagement_status FOR UPDATE 
USING (user_id = auth.uid());

-- Super admins can view all
CREATE POLICY "Super admins can view all engagement" 
ON public.user_engagement_status FOR SELECT 
USING (public.is_super_admin());

-- Auto-update updated_at
CREATE TRIGGER update_engagement_updated_at
BEFORE UPDATE ON public.user_engagement_status
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to refresh engagement status from real data
CREATE OR REPLACE FUNCTION public.refresh_engagement_status(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_has_project boolean;
  v_has_budget boolean;
  v_total_records integer;
  v_last_action timestamptz;
BEGIN
  SELECT EXISTS(SELECT 1 FROM obras WHERE user_id = p_user_id) INTO v_has_project;
  SELECT EXISTS(SELECT 1 FROM orcamentos WHERE user_id = p_user_id) INTO v_has_budget;
  
  SELECT COUNT(*)::integer INTO v_total_records FROM (
    SELECT id FROM obras WHERE user_id = p_user_id
    UNION ALL SELECT id FROM orcamentos WHERE user_id = p_user_id
    UNION ALL SELECT id FROM rdos WHERE user_id = p_user_id
    UNION ALL SELECT id FROM contas_financeiras WHERE user_id = p_user_id
  ) sub;
  
  SELECT MAX(d) INTO v_last_action FROM (
    SELECT MAX(created_at) as d FROM obras WHERE user_id = p_user_id
    UNION ALL SELECT MAX(created_at) FROM orcamentos WHERE user_id = p_user_id
    UNION ALL SELECT MAX(created_at) FROM rdos WHERE user_id = p_user_id
  ) sub;
  
  INSERT INTO user_engagement_status (user_id, has_created_project, has_created_budget, total_records_created, last_action_date, last_login_date)
  VALUES (p_user_id, v_has_project, v_has_budget, v_total_records, v_last_action, now())
  ON CONFLICT (user_id) DO UPDATE SET
    has_created_project = v_has_project,
    has_created_budget = v_has_budget,
    total_records_created = v_total_records,
    last_action_date = COALESCE(v_last_action, user_engagement_status.last_action_date),
    last_login_date = now();
END;
$$;
