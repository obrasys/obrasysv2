CREATE OR REPLACE FUNCTION public.refresh_engagement_status(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    UNION ALL SELECT id FROM relatorios_diarios WHERE user_id = p_user_id
    UNION ALL SELECT id FROM contas_financeiras WHERE user_id = p_user_id
  ) sub;
  
  SELECT MAX(d) INTO v_last_action FROM (
    SELECT MAX(created_at) as d FROM obras WHERE user_id = p_user_id
    UNION ALL SELECT MAX(created_at) FROM orcamentos WHERE user_id = p_user_id
    UNION ALL SELECT MAX(created_at) FROM relatorios_diarios WHERE user_id = p_user_id
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