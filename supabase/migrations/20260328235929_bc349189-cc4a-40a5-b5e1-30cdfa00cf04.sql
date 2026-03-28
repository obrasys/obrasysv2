
-- Phase 2: Add database functions for progress recalculation and reforecast

-- Function to recalculate task progress from approved daily report activities
CREATE OR REPLACE FUNCTION public.recalculate_task_progress_from_rdo(p_daily_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_activity RECORD;
  v_task RECORD;
  v_total_done NUMERIC;
  v_total_planned NUMERIC;
  v_new_percent NUMERIC;
  v_avg_productivity NUMERIC;
  v_remaining_qty NUMERIC;
  v_remaining_days NUMERIC;
BEGIN
  -- For each activity in this daily report
  FOR v_activity IN 
    SELECT * FROM daily_report_activities WHERE daily_report_id = p_daily_report_id
  LOOP
    -- Skip if no schedule task linked
    IF v_activity.schedule_task_id IS NULL THEN CONTINUE; END IF;
    
    -- Get the schedule task
    SELECT * INTO v_task FROM project_schedule_tasks WHERE id = v_activity.schedule_task_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    
    -- Update task actual progress
    UPDATE project_schedule_tasks SET
      actual_progress_percent = LEAST(v_activity.actual_percent_after_rdo, 100),
      actual_start = CASE 
        WHEN actual_start IS NULL AND v_activity.actual_percent_after_rdo > 0 
        THEN (SELECT report_date FROM daily_reports WHERE id = p_daily_report_id)::text
        ELSE actual_start
      END,
      actual_end = CASE 
        WHEN v_activity.actual_percent_after_rdo >= 100 
        THEN (SELECT report_date FROM daily_reports WHERE id = p_daily_report_id)::text
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
        THEN (CURRENT_DATE + v_activity.estimated_remaining_duration_days::integer)::text
        WHEN v_activity.actual_percent_after_rdo >= 100
        THEN (SELECT report_date FROM daily_reports WHERE id = p_daily_report_id)::text
        ELSE forecast_end
      END,
      projected_progress_percent = LEAST(
        v_activity.actual_percent_after_rdo + COALESCE(v_activity.daily_deviation, 0),
        100
      ),
      updated_at = now()
    WHERE id = v_activity.schedule_task_id;
    
    -- Record productivity history
    INSERT INTO task_productivity_history (
      user_id, obra_id, schedule_task_id, reference_date,
      planned_productivity, actual_productivity, average_actual_productivity
    ) VALUES (
      v_task.user_id, v_task.obra_id, v_task.id,
      (SELECT report_date FROM daily_reports WHERE id = p_daily_report_id),
      COALESCE(v_activity.planned_productivity_day, 0),
      COALESCE(v_activity.actual_productivity_day, 0),
      COALESCE(v_activity.average_productivity_task, 0)
    );
  END LOOP;
END;
$$;

-- Function to propagate delay impact to successor tasks (FS dependencies)
CREATE OR REPLACE FUNCTION public.propagate_dependency_impact(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task RECORD;
  v_dep RECORD;
  v_successor RECORD;
  v_new_start DATE;
BEGIN
  SELECT * INTO v_task FROM project_schedule_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- For each FS dependency where this task is predecessor
  FOR v_dep IN 
    SELECT * FROM project_schedule_dependencies 
    WHERE predecessor_task_id = p_task_id AND dependency_type = 'FS'
  LOOP
    SELECT * INTO v_successor FROM project_schedule_tasks WHERE id = v_dep.successor_task_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    
    -- Calculate new start for successor based on predecessor's forecast/actual end
    v_new_start := COALESCE(
      v_task.forecast_end::date,
      v_task.actual_end::date,
      v_task.planned_end::date
    ) + v_dep.lag_days;
    
    -- Only push forward, never pull back
    IF v_successor.planned_start IS NOT NULL AND v_new_start > v_successor.planned_start::date THEN
      UPDATE project_schedule_tasks SET
        forecast_start = v_new_start::text,
        forecast_end = CASE 
          WHEN planned_duration_days IS NOT NULL 
          THEN (v_new_start + planned_duration_days)::text
          ELSE forecast_end
        END,
        updated_at = now()
      WHERE id = v_dep.successor_task_id
        AND (forecast_start IS NULL OR v_new_start > forecast_start::date);
      
      -- Recursively propagate
      PERFORM propagate_dependency_impact(v_dep.successor_task_id);
    END IF;
  END LOOP;
END;
$$;

-- Function to generate task progress snapshot
CREATE OR REPLACE FUNCTION public.generate_task_snapshots(p_obra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task RECORD;
  v_delay_days INTEGER;
BEGIN
  FOR v_task IN 
    SELECT * FROM project_schedule_tasks 
    WHERE obra_id = p_obra_id AND status_flag != 'not_started'
  LOOP
    v_delay_days := 0;
    IF v_task.planned_end IS NOT NULL AND v_task.forecast_end IS NOT NULL THEN
      v_delay_days := GREATEST(0, (v_task.forecast_end::date - v_task.planned_end::date));
    END IF;
    
    INSERT INTO task_progress_snapshots (
      user_id, obra_id, schedule_task_id, snapshot_date,
      planned_progress_percent, actual_progress_percent,
      projected_progress_percent, delay_days, status_flag
    ) VALUES (
      v_task.user_id, p_obra_id, v_task.id, CURRENT_DATE,
      v_task.planned_progress_percent, v_task.actual_progress_percent,
      v_task.projected_progress_percent, v_delay_days, v_task.status_flag
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Function to generate project-level progress snapshot
CREATE OR REPLACE FUNCTION public.generate_project_snapshot(p_obra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Get user_id from any task
  SELECT user_id INTO v_user_id FROM project_schedule_tasks WHERE obra_id = p_obra_id LIMIT 1;
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  -- Calculate weighted progress from root tasks only
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
      v_max_delay := GREATEST(v_max_delay, (v_task.forecast_end::date - v_task.planned_end::date));
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
  
  -- Estimate completion date
  SELECT MAX(COALESCE(forecast_end, planned_end))::date INTO v_completion_date
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
    v_completion_date::text
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to classify delay risk for a task
CREATE OR REPLACE FUNCTION public.classify_task_delay(p_task_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task RECORD;
  v_delay_days INTEGER;
  v_duration INTEGER;
  v_ratio NUMERIC;
BEGIN
  SELECT * INTO v_task FROM project_schedule_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN 'recoverable'; END IF;
  
  IF v_task.planned_end IS NULL OR v_task.forecast_end IS NULL THEN
    RETURN 'recoverable';
  END IF;
  
  v_delay_days := (v_task.forecast_end::date - v_task.planned_end::date);
  IF v_delay_days <= 0 THEN RETURN 'recoverable'; END IF;
  
  v_duration := COALESCE(v_task.planned_duration_days, 30);
  v_ratio := v_delay_days::numeric / GREATEST(v_duration, 1);
  
  IF v_ratio > 0.5 OR (v_task.criticality = 'critical' AND v_delay_days > 5) THEN
    RETURN 'critical';
  ELSIF v_ratio > 0.2 OR v_delay_days > 10 THEN
    RETURN 'structural';
  ELSE
    RETURN 'recoverable';
  END IF;
END;
$$;

-- Add unique constraint for snapshots to enable ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_progress_snapshots_task_date_unique'
  ) THEN
    ALTER TABLE task_progress_snapshots 
      ADD CONSTRAINT task_progress_snapshots_task_date_unique 
      UNIQUE (schedule_task_id, snapshot_date);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_progress_snapshots_obra_date_unique'
  ) THEN
    ALTER TABLE project_progress_snapshots 
      ADD CONSTRAINT project_progress_snapshots_obra_date_unique 
      UNIQUE (obra_id, snapshot_date);
  END IF;
END $$;
