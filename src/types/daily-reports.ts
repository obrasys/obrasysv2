// Daily Reports (RDO Operacional) types

export type DayType = 'normal' | 'partial' | 'unproductive' | 'suspended';
export type WeatherImpact = 'none' | 'partial' | 'total';
export type WorkRegime = 'normal' | 'overtime' | 'night';
export type ProductionLevel = 'above_expected' | 'within_expected' | 'below_expected';
export type DailyReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ConstraintType = 'design' | 'material' | 'labor' | 'equipment' | 'weather' | 'client' | 'license' | 'inspection' | 'safety' | 'subcontractor' | 'financial' | 'access' | 'logistics' | 'pending_decision';
export type ConstraintSeverity = 'low' | 'medium' | 'high' | 'total';
export type ConstraintStatus = 'open' | 'in_progress' | 'resolved';
export type EquipmentStatus = 'operational' | 'broken' | 'maintenance';
export type QualityStatus = 'approved' | 'rejected' | 'partial';
export type ActivityTaskStatus = 'not_started' | 'started' | 'in_progress' | 'suspended' | 'completed';

export interface DailyReport {
  id: string;
  user_id: string;
  obra_id: string;
  report_date: string;
  weekday: string | null;
  shift: string;
  filled_by_user_id: string | null;
  responsible_engineer_id: string | null;
  responsible_site_manager_id: string | null;
  status: DailyReportStatus;
  opened_at: string | null;
  closed_at: string | null;
  geolocation_lat: number | null;
  geolocation_lng: number | null;
  workfront_id: string | null;
  day_type: DayType;
  weather_condition: string | null;
  weather_impact: WeatherImpact;
  planned_work_hours: number;
  actual_work_hours: number | null;
  work_regime: WorkRegime;
  daily_production_level: ProductionLevel | null;
  executive_summary: string | null;
  critical_occurrences: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  obra?: { id: string; nome: string; cliente: string };
}

export interface DailyReportActivity {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  schedule_task_id: string | null;
  wbs_code: string | null;
  work_area: string | null;
  total_planned_quantity: number;
  unit: string | null;
  planned_percent_to_date: number;
  actual_percent_before_rdo: number;
  actual_percent_after_rdo: number;
  quantity_planned_today: number;
  quantity_done_today: number;
  quantity_done_accumulated: number;
  remaining_quantity: number;
  planned_productivity_day: number | null;
  actual_productivity_day: number | null;
  average_productivity_task: number | null;
  daily_deviation: number;
  accumulated_deviation: number;
  plan_adherence_percent: number;
  schedule_performance_index: number | null;
  estimated_remaining_duration_days: number | null;
  impact_schedule_days: number;
  task_status: ActivityTaskStatus;
  not_started_or_suspension_reason: string | null;
  requires_replanning: boolean;
  criticality: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  schedule_task?: { id: string; name: string; wbs_code: string };
}

export interface DailyReportProduction {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  daily_report_activity_id: string | null;
  related_schedule_task_id: string | null;
  service_name: string;
  subservice_name: string | null;
  exact_location: string | null;
  quantity_planned_today: number;
  quantity_executed_today: number;
  unit: string | null;
  accumulated_production: number;
  executed_percent_task: number;
  rejected_production: number;
  approved_production: number;
  technical_notes: string | null;
}

export interface DailyReportLaborResource {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  daily_report_activity_id: string | null;
  role_name: string;
  planned_workers_count: number;
  present_workers_count: number;
  hours_per_resource: number;
  absences_count: number;
  team_productivity: number | null;
  performance_notes: string | null;
}

export interface DailyReportEquipmentResource {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  daily_report_activity_id: string | null;
  equipment_name: string;
  quantity: number;
  available_hours: number;
  hours_in_use: number;
  downtime_hours: number;
  downtime_reason: string | null;
  equipment_status: EquipmentStatus;
}

export interface DailyReportMaterial {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  daily_report_activity_id: string | null;
  material_name: string;
  consumed_quantity_today: number;
  received_quantity_today: number;
  unit: string | null;
  shortage_flag: boolean;
  rejected_quantity: number;
  stock_risk_flag: boolean;
  supplier_name: string | null;
  batch_reference: string | null;
}

export interface DailyReportConstraint {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  impacted_task_id: string | null;
  constraint_type: ConstraintType;
  objective_description: string;
  impact_start_at: string | null;
  impact_end_at: string | null;
  severity: ConstraintSeverity;
  impact_hours: number;
  impact_days: number;
  responsible_resolution_user_id: string | null;
  resolution_due_date: string | null;
  status: ConstraintStatus;
  blocks_successors: boolean;
  triggers_auto_replanning: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyReportQuality {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  inspections_count: number;
  non_conformities_count: number;
  rework_generated: boolean;
  blocked_tasks_by_quality: number;
  rejected_quantity: number;
  reexecuted_quantity: number;
  quality_status: QualityStatus;
  notes: string | null;
}

export interface DailyReportSafety {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  incidents_count: number;
  near_misses_count: number;
  interdicted_workfronts_count: number;
  stoppages_due_safety: number;
  lost_hours_due_safety: number;
  notes: string | null;
}

export interface DailyReportClientInspection {
  id: string;
  user_id: string;
  obra_id: string;
  daily_report_id: string;
  pending_approvals_count: number;
  releases_issued_count: number;
  technical_pending_items: string | null;
  extraordinary_requests: string | null;
  scope_change_flag: boolean;
  notes: string | null;
}

// Form data
export interface DailyReportFormData {
  obra_id: string;
  report_date: string;
  shift?: string;
  day_type?: DayType;
  weather_condition?: string;
  weather_impact?: WeatherImpact;
  planned_work_hours?: number;
  actual_work_hours?: number;
  work_regime?: WorkRegime;
  daily_production_level?: ProductionLevel;
  executive_summary?: string;
  critical_occurrences?: string;
  workfront_id?: string;
  status?: DailyReportStatus;
}

export const CONSTRAINT_TYPE_LABELS: Record<ConstraintType, string> = {
  design: 'Projeto',
  material: 'Material',
  labor: 'Mão de obra',
  equipment: 'Equipamento',
  weather: 'Meteorologia',
  client: 'Cliente',
  license: 'Licenciamento',
  inspection: 'Fiscalização',
  safety: 'Segurança',
  subcontractor: 'Subempreiteiro',
  financial: 'Financeiro',
  access: 'Acesso',
  logistics: 'Logística',
  pending_decision: 'Decisão pendente',
};

export const WEATHER_OPTIONS = [
  'Limpo', 'Parcialmente nublado', 'Nublado', 'Chuva fraca', 'Chuva moderada',
  'Chuva forte', 'Trovoada', 'Vento forte', 'Nevoeiro', 'Neve', 'Granizo',
];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  normal: 'Normal',
  partial: 'Parcial',
  unproductive: 'Improdutivo',
  suspended: 'Suspenso',
};
