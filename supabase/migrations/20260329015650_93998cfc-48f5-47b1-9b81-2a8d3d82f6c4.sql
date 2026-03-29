CREATE OR REPLACE FUNCTION public.generate_project_snapshot(p_obra_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_planned NUMERIC := 0;
  v_actual NUMERIC := 0;
  v_projected NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_task RECORD;
  v_weight NUMERIC;
  v_health TEXT := 'on_track';
  v_deviation NUMERIC;
  v_max_delay INTEGER := 0;
  v_completion_date DATE;
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM project_schedule_tasks WHERE obra_id = p_obra_id LIMIT 1;
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  FOR v_task IN 
    SELECT * FROM project_schedule_tasks 
    WHERE obra_id = p_obra_id AND parent_task_id IS NULL
  LOOP
    v_weight := COALESCE(v_task.weight_financial, v_task.weight_physical, 1);
    v_total_weight := v_total_weight + v_weight;
    v_planned := v_planned + (v_task.planned_progress_percent * v_weight);
    v_actual := v_actual + (v_task.actual_progress_percent * v_weight);
    v_projected := v_projected + (v_task.projected_progress_percent * v_weight);
    
    IF v_task.forecast_end IS NOT NULL AND v_task.planned_end IS NOT NULL THEN
      v_max_delay := GREATEST(v_max_delay, (v_task.forecast_end - v_task.planned_end));
    END IF;
  END LOOP;
  
  IF v_total_weight > 0 THEN
    v_planned := v_planned / v_total_weight;
    v_actual := v_actual / v_total_weight;
    v_projected := v_projected / v_total_weight;
  END IF;
  
  v_deviation := v_actual - v_planned;
  
  IF v_deviation < -15 THEN v_health := 'critical';
  ELSIF v_deviation < -10 THEN v_health := 'delayed';
  ELSIF v_deviation < -5 THEN v_health := 'at_risk';
  END IF;
  
  SELECT MAX(COALESCE(forecast_end, planned_end)) INTO v_completion_date
  FROM project_schedule_tasks 
  WHERE obra_id = p_obra_id AND parent_task_id IS NULL;
  
  INSERT INTO project_progress_snapshots (
    user_id, obra_id, snapshot_date,
    planned_global_progress, actual_global_progress, projected_global_progress,
    physical_deviation, schedule_deviation_days, health_status,
    probable_completion_date
  ) VALUES (
    v_user_id, p_obra_id, CURRENT_DATE,
    ROUND(v_planned, 2), ROUND(v_actual, 2), ROUND(v_projected, 2),
    ROUND(v_deviation, 2), v_max_delay, v_health,
    v_completion_date
  )
  ON CONFLICT DO NOTHING;
END;
$function$