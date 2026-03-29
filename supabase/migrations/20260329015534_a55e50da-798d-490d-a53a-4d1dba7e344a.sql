CREATE OR REPLACE FUNCTION public.recalculate_task_progress_from_rdo(p_daily_report_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_activity RECORD;
  v_task RECORD;
  v_report_date DATE;
BEGIN
  SELECT report_date INTO v_report_date FROM daily_reports WHERE id = p_daily_report_id;
  IF v_report_date IS NULL THEN RETURN; END IF;

  FOR v_activity IN 
    SELECT * FROM daily_report_activities WHERE daily_report_id = p_daily_report_id
  LOOP
    IF v_activity.schedule_task_id IS NULL THEN CONTINUE; END IF;
    
    SELECT * INTO v_task FROM project_schedule_tasks WHERE id = v_activity.schedule_task_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    
    UPDATE project_schedule_tasks SET
      actual_progress_percent = LEAST(v_activity.actual_percent_after_rdo, 100),
      actual_start = CASE 
        WHEN actual_start IS NULL AND v_activity.actual_percent_after_rdo > 0 
        THEN v_report_date
        ELSE actual_start
      END,
      actual_end = CASE 
        WHEN v_activity.actual_percent_after_rdo >= 100 
        THEN v_report_date
        ELSE actual_end
      END,
      status_flag = CASE
        WHEN v_activity.actual_percent_after_rdo >= 100 THEN 'completed'
        WHEN v_activity.actual_percent_after_rdo > 0 THEN 'in_progress'
        ELSE v_task.status_flag
      END,
      remaining_duration_days = v_activity.estimated_remaining_duration_days,
      forecast_end = CASE
        WHEN v_activity.estimated_remaining_duration_days IS NOT NULL AND v_activity.estimated_remaining_duration_days > 0
        THEN (CURRENT_DATE + v_activity.estimated_remaining_duration_days::integer)
        WHEN v_activity.actual_percent_after_rdo >= 100
        THEN v_report_date
        ELSE forecast_end
      END,
      projected_progress_percent = LEAST(
        v_activity.actual_percent_after_rdo + COALESCE(v_activity.daily_deviation, 0),
        100
      ),
      updated_at = now()
    WHERE id = v_activity.schedule_task_id;
    
    INSERT INTO task_productivity_history (
      user_id, obra_id, schedule_task_id, reference_date,
      planned_productivity, actual_productivity, average_actual_productivity
    ) VALUES (
      v_task.user_id, v_task.obra_id, v_task.id,
      v_report_date,
      COALESCE(v_activity.planned_productivity_day, 0),
      COALESCE(v_activity.actual_productivity_day, 0),
      COALESCE(v_activity.average_productivity_task, 0)
    );
  END LOOP;
END;
$function$