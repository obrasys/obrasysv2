CREATE OR REPLACE FUNCTION public.propagate_dependency_impact(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_task RECORD;
  v_dep RECORD;
  v_successor RECORD;
  v_new_start DATE;
BEGIN
  SELECT * INTO v_task FROM project_schedule_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  FOR v_dep IN 
    SELECT * FROM project_schedule_dependencies 
    WHERE predecessor_task_id = p_task_id AND dependency_type = 'FS'
  LOOP
    SELECT * INTO v_successor FROM project_schedule_tasks WHERE id = v_dep.successor_task_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    
    v_new_start := COALESCE(
      v_task.forecast_end,
      v_task.actual_end,
      v_task.planned_end
    ) + v_dep.lag_days;
    
    IF v_successor.planned_start IS NOT NULL AND v_new_start > v_successor.planned_start THEN
      UPDATE project_schedule_tasks SET
        forecast_start = v_new_start,
        forecast_end = CASE 
          WHEN planned_duration_days IS NOT NULL 
          THEN (v_new_start + planned_duration_days)
          ELSE forecast_end
        END,
        updated_at = now()
      WHERE id = v_dep.successor_task_id
        AND (forecast_start IS NULL OR v_new_start > forecast_start);
      
      PERFORM propagate_dependency_impact(v_dep.successor_task_id);
    END IF;
  END LOOP;
END;
$function$