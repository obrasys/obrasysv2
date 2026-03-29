ALTER TABLE public.user_onboarding_progress
  ADD COLUMN IF NOT EXISTS wizard_status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS wizard_current_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_goal text,
  ADD COLUMN IF NOT EXISTS selected_role text;