-- Overload log_budget_event to accept (budget_version_id, event_type, metadata jsonb)
-- as used by register_purchase, generate_final_closing_sheet, create_contracting_package and confirm_award
CREATE OR REPLACE FUNCTION public.log_budget_event(
  p_budget_version_id uuid,
  p_event_type text,
  p_metadata jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_source_budget_id uuid;
BEGIN
  SELECT source_budget_id INTO v_source_budget_id
  FROM public.budget_versions WHERE id = p_budget_version_id;

  IF v_source_budget_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.log_budget_event(
    v_source_budget_id,
    p_event_type,
    p_budget_version_id,
    NULL,
    NULL,
    NULL,
    p_metadata,
    NULL
  );
END;
$$;