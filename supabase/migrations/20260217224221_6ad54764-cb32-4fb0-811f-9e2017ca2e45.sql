
CREATE TABLE public.user_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  first_login_done boolean DEFAULT false,
  step_1_completed boolean DEFAULT false,
  step_2_completed boolean DEFAULT false,
  step_3_completed boolean DEFAULT false,
  step_4_completed boolean DEFAULT false,
  onboarding_dismissed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding"
ON public.user_onboarding_progress FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_onboarding_progress(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_s1 boolean; v_s2 boolean; v_s3 boolean; v_s4 boolean;
  v_all boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM obras WHERE user_id = p_user_id) INTO v_s1;
  SELECT EXISTS(SELECT 1 FROM orcamentos WHERE user_id = p_user_id) INTO v_s2;
  SELECT EXISTS(SELECT 1 FROM equipa_membros WHERE user_id = p_user_id) INTO v_s3;
  SELECT EXISTS(SELECT 1 FROM rdos WHERE user_id = p_user_id) INTO v_s4;
  v_all := v_s1 AND v_s2 AND v_s3 AND v_s4;

  INSERT INTO user_onboarding_progress (user_id, step_1_completed, step_2_completed, step_3_completed, step_4_completed, completed_at)
  VALUES (p_user_id, v_s1, v_s2, v_s3, v_s4, CASE WHEN v_all THEN now() ELSE null END)
  ON CONFLICT (user_id) DO UPDATE SET
    step_1_completed = v_s1,
    step_2_completed = v_s2,
    step_3_completed = v_s3,
    step_4_completed = v_s4,
    completed_at = CASE WHEN v_all AND user_onboarding_progress.completed_at IS NULL THEN now() ELSE user_onboarding_progress.completed_at END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
