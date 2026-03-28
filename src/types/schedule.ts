// Schedule types for Cronograma module

export type ScheduleVersionType = 'estimated' | 'reforecast' | 'manual_revision';
export type GeneratedByType = 'system' | 'axia' | 'user';
export type ApprovalStatus = 'draft' | 'pending_validation' | 'approved' | 'rejected';
export type TaskType = 'phase' | 'task' | 'milestone';
export type ProgressMethod = 'manual_structured' | 'quantity_based' | 'percent_increment';
export type ProgressCurveType = 'linear' | 'front_loaded' | 'back_loaded' | 's_curve';
export type Criticality = 'critical' | 'non_critical';
export type DelayClassification = 'recoverable' | 'structural' | 'critical';
export type TaskStatusFlag = 'not_started' | 'started' | 'in_progress' | 'suspended' | 'completed';
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';
export type HealthStatus = 'on_track' | 'at_risk' | 'delayed' | 'critical';
export type MilestoneStatus = 'planned' | 'forecasted' | 'achieved' | 'delayed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ScheduleVersion {
  id: string;
  user_id: string;
  obra_id: string;
  version_no: number;
  type: ScheduleVersionType;
  is_baseline: boolean;
  generated_by_type: GeneratedByType;
  source_budget_id: string | null;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleTask {
  id: string;
  user_id: string;
  obra_id: string;
  schedule_version_id: string;
  parent_task_id: string | null;
  code: string | null;
  wbs_code: string | null;
  name: string;
  task_type: TaskType;
  work_area_label: string | null;
  budget_chapter_id: string | null;
  budget_item_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  planned_duration_days: number | null;
  total_planned_quantity: number;
  unit: string | null;
  actual_start: string | null;
  actual_end: string | null;
  forecast_start: string | null;
  forecast_end: string | null;
  remaining_duration_days: number | null;
  weight_physical: number;
  weight_financial: number | null;
  progress_method: ProgressMethod;
  planned_progress_curve_type: ProgressCurveType;
  planned_progress_percent: number;
  actual_progress_percent: number;
  projected_progress_percent: number;
  schedule_float_days: number;
  criticality: Criticality;
  delay_classification: DelayClassification | null;
  status_flag: TaskStatusFlag;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // UI helpers
  children?: ScheduleTask[];
  level?: number;
}

export interface ScheduleDependency {
  id: string;
  user_id: string;
  obra_id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
}

export interface TaskProgressSnapshot {
  id: string;
  user_id: string;
  obra_id: string;
  schedule_task_id: string;
  snapshot_date: string;
  planned_progress_percent: number;
  actual_progress_percent: number;
  projected_progress_percent: number;
  delay_days: number;
  status_flag: string | null;
  generated_at: string;
}

export interface ProjectProgressSnapshot {
  id: string;
  user_id: string;
  obra_id: string;
  snapshot_date: string;
  planned_global_progress: number;
  actual_global_progress: number;
  projected_global_progress: number;
  physical_deviation: number;
  schedule_deviation_days: number;
  health_status: HealthStatus;
  probable_completion_date: string | null;
  generated_at: string;
}

export interface ProjectMilestone {
  id: string;
  user_id: string;
  obra_id: string;
  related_task_id: string | null;
  name: string;
  planned_date: string | null;
  forecast_date: string | null;
  actual_date: string | null;
  status: MilestoneStatus;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
}

export interface TaskReforecast {
  id: string;
  user_id: string;
  obra_id: string;
  schedule_task_id: string;
  reference_daily_report_id: string | null;
  previous_forecast_end: string | null;
  new_forecast_end: string | null;
  previous_remaining_duration_days: number | null;
  new_remaining_duration_days: number | null;
  delay_classification: DelayClassification | null;
  reason_summary: string | null;
  created_at: string;
}

// Form data types
export interface ScheduleTaskFormData {
  name: string;
  task_type: TaskType;
  parent_task_id?: string;
  code?: string;
  wbs_code?: string;
  work_area_label?: string;
  planned_start?: string;
  planned_end?: string;
  planned_duration_days?: number;
  total_planned_quantity?: number;
  unit?: string;
  weight_physical?: number;
  weight_financial?: number;
  progress_method?: ProgressMethod;
  planned_progress_curve_type?: ProgressCurveType;
  sort_order?: number;
}
