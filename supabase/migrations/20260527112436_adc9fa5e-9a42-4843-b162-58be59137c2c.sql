ALTER TABLE public.icf_assistant_sessions
  ADD COLUMN IF NOT EXISTS calibration_method TEXT,
  ADD COLUMN IF NOT EXISTS calibration_point_a JSONB,
  ADD COLUMN IF NOT EXISTS calibration_point_b JSONB,
  ADD COLUMN IF NOT EXISTS calibration_distance_px NUMERIC,
  ADD COLUMN IF NOT EXISTS calibration_real_distance_m NUMERIC,
  ADD COLUMN IF NOT EXISTS calibration_declared_scale TEXT,
  ADD COLUMN IF NOT EXISTS calibration_confidence TEXT,
  ADD COLUMN IF NOT EXISTS calibration_page INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS calibration_override BOOLEAN DEFAULT FALSE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'icf_assistant_sessions_calibration_method_check') THEN
    ALTER TABLE public.icf_assistant_sessions
      ADD CONSTRAINT icf_assistant_sessions_calibration_method_check
      CHECK (calibration_method IS NULL OR calibration_method IN ('known_distance','declared_scale','uncalibrated'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'icf_assistant_sessions_calibration_confidence_check') THEN
    ALTER TABLE public.icf_assistant_sessions
      ADD CONSTRAINT icf_assistant_sessions_calibration_confidence_check
      CHECK (calibration_confidence IS NULL OR calibration_confidence IN ('alta','media','baixa'));
  END IF;
END $$;