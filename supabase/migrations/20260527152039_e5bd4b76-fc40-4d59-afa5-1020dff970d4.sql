ALTER TABLE public.icf_assistant_sessions
  ADD COLUMN IF NOT EXISTS analysis_mode text NOT NULL DEFAULT 'architectural_to_icf';

ALTER TABLE public.icf_assistant_sessions
  DROP CONSTRAINT IF EXISTS icf_assistant_sessions_analysis_mode_check;

ALTER TABLE public.icf_assistant_sessions
  ADD CONSTRAINT icf_assistant_sessions_analysis_mode_check
  CHECK (analysis_mode IN ('architectural_to_icf','complete_icf_project','ifc_bim'));