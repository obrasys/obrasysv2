
-- =====================================================
-- PHASE 1: Schedule, Daily Reports, Progress & Alerts
-- =====================================================

-- 1. project_schedule_versions
CREATE TABLE public.project_schedule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'estimated' CHECK (type IN ('estimated', 'reforecast', 'manual_revision')),
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  generated_by_type TEXT NOT NULL DEFAULT 'user' CHECK (generated_by_type IN ('system', 'axia', 'user')),
  source_budget_id UUID REFERENCES public.orcamentos(id),
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_validation', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. project_schedule_tasks
CREATE TABLE public.project_schedule_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  schedule_version_id UUID NOT NULL REFERENCES public.project_schedule_versions(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  code TEXT,
  wbs_code TEXT,
  name TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('phase', 'task', 'milestone')),
  work_area_label TEXT,
  budget_chapter_id UUID,
  budget_item_id UUID,
  planned_start DATE,
  planned_end DATE,
  planned_duration_days INTEGER,
  total_planned_quantity NUMERIC DEFAULT 0,
  unit TEXT,
  actual_start DATE,
  actual_end DATE,
  forecast_start DATE,
  forecast_end DATE,
  remaining_duration_days INTEGER,
  weight_physical NUMERIC DEFAULT 1,
  weight_financial NUMERIC,
  progress_method TEXT NOT NULL DEFAULT 'quantity_based' CHECK (progress_method IN ('manual_structured', 'quantity_based', 'percent_increment')),
  planned_progress_curve_type TEXT DEFAULT 'linear' CHECK (planned_progress_curve_type IN ('linear', 'front_loaded', 'back_loaded', 's_curve')),
  planned_progress_percent NUMERIC DEFAULT 0,
  actual_progress_percent NUMERIC DEFAULT 0,
  projected_progress_percent NUMERIC DEFAULT 0,
  schedule_float_days INTEGER DEFAULT 0,
  criticality TEXT DEFAULT 'non_critical' CHECK (criticality IN ('critical', 'non_critical')),
  delay_classification TEXT CHECK (delay_classification IN ('recoverable', 'structural', 'critical')),
  status_flag TEXT DEFAULT 'not_started' CHECK (status_flag IN ('not_started', 'started', 'in_progress', 'suspended', 'completed')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. project_schedule_dependencies
CREATE TABLE public.project_schedule_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  predecessor_task_id UUID NOT NULL REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. daily_reports (nova RDO operacional)
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  weekday TEXT,
  shift TEXT DEFAULT 'day',
  filled_by_user_id UUID REFERENCES auth.users(id),
  responsible_engineer_id UUID,
  responsible_site_manager_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  geolocation_lat NUMERIC,
  geolocation_lng NUMERIC,
  workfront_id TEXT,
  day_type TEXT DEFAULT 'normal' CHECK (day_type IN ('normal', 'partial', 'unproductive', 'suspended')),
  weather_condition TEXT,
  weather_impact TEXT DEFAULT 'none' CHECK (weather_impact IN ('none', 'partial', 'total')),
  planned_work_hours NUMERIC DEFAULT 8,
  actual_work_hours NUMERIC,
  work_regime TEXT DEFAULT 'normal' CHECK (work_regime IN ('normal', 'overtime', 'night')),
  daily_production_level TEXT CHECK (daily_production_level IN ('above_expected', 'within_expected', 'below_expected')),
  executive_summary TEXT,
  critical_occurrences TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, report_date, shift)
);

-- 5. daily_report_activities (tabela ponte RDO↔Cronograma)
CREATE TABLE public.daily_report_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  schedule_task_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  wbs_code TEXT,
  work_area TEXT,
  total_planned_quantity NUMERIC DEFAULT 0,
  unit TEXT,
  planned_percent_to_date NUMERIC DEFAULT 0,
  actual_percent_before_rdo NUMERIC DEFAULT 0,
  actual_percent_after_rdo NUMERIC DEFAULT 0,
  quantity_planned_today NUMERIC DEFAULT 0,
  quantity_done_today NUMERIC DEFAULT 0,
  quantity_done_accumulated NUMERIC DEFAULT 0,
  remaining_quantity NUMERIC DEFAULT 0,
  planned_productivity_day NUMERIC,
  actual_productivity_day NUMERIC,
  average_productivity_task NUMERIC,
  daily_deviation NUMERIC DEFAULT 0,
  accumulated_deviation NUMERIC DEFAULT 0,
  plan_adherence_percent NUMERIC DEFAULT 0,
  schedule_performance_index NUMERIC,
  estimated_remaining_duration_days NUMERIC,
  impact_schedule_days NUMERIC DEFAULT 0,
  task_status TEXT DEFAULT 'not_started' CHECK (task_status IN ('not_started', 'started', 'in_progress', 'suspended', 'completed')),
  not_started_or_suspension_reason TEXT,
  requires_replanning BOOLEAN DEFAULT false,
  criticality TEXT DEFAULT 'non_critical' CHECK (criticality IN ('critical', 'non_critical')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. daily_report_productions
CREATE TABLE public.daily_report_productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  daily_report_activity_id UUID REFERENCES public.daily_report_activities(id) ON DELETE SET NULL,
  related_schedule_task_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  subservice_name TEXT,
  exact_location TEXT,
  quantity_planned_today NUMERIC DEFAULT 0,
  quantity_executed_today NUMERIC DEFAULT 0,
  unit TEXT,
  accumulated_production NUMERIC DEFAULT 0,
  executed_percent_task NUMERIC DEFAULT 0,
  rejected_production NUMERIC DEFAULT 0,
  approved_production NUMERIC DEFAULT 0,
  technical_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. daily_report_labor_resources
CREATE TABLE public.daily_report_labor_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  daily_report_activity_id UUID REFERENCES public.daily_report_activities(id) ON DELETE SET NULL,
  role_name TEXT NOT NULL,
  planned_workers_count INTEGER DEFAULT 0,
  present_workers_count INTEGER DEFAULT 0,
  hours_per_resource NUMERIC DEFAULT 8,
  absences_count INTEGER DEFAULT 0,
  team_productivity NUMERIC,
  performance_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. daily_report_equipment_resources
CREATE TABLE public.daily_report_equipment_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  daily_report_activity_id UUID REFERENCES public.daily_report_activities(id) ON DELETE SET NULL,
  equipment_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  available_hours NUMERIC DEFAULT 8,
  hours_in_use NUMERIC DEFAULT 0,
  downtime_hours NUMERIC DEFAULT 0,
  downtime_reason TEXT,
  equipment_status TEXT DEFAULT 'operational' CHECK (equipment_status IN ('operational', 'broken', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. daily_report_materials
CREATE TABLE public.daily_report_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  daily_report_activity_id UUID REFERENCES public.daily_report_activities(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  consumed_quantity_today NUMERIC DEFAULT 0,
  received_quantity_today NUMERIC DEFAULT 0,
  unit TEXT,
  shortage_flag BOOLEAN DEFAULT false,
  rejected_quantity NUMERIC DEFAULT 0,
  stock_risk_flag BOOLEAN DEFAULT false,
  supplier_name TEXT,
  batch_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. daily_report_constraints
CREATE TABLE public.daily_report_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  impacted_task_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('design', 'material', 'labor', 'equipment', 'weather', 'client', 'license', 'inspection', 'safety', 'subcontractor', 'financial', 'access', 'logistics', 'pending_decision')),
  objective_description TEXT NOT NULL,
  impact_start_at TIMESTAMPTZ,
  impact_end_at TIMESTAMPTZ,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'total')),
  impact_hours NUMERIC DEFAULT 0,
  impact_days NUMERIC DEFAULT 0,
  responsible_resolution_user_id UUID,
  resolution_due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  blocks_successors BOOLEAN DEFAULT false,
  triggers_auto_replanning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. daily_report_quality
CREATE TABLE public.daily_report_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  inspections_count INTEGER DEFAULT 0,
  non_conformities_count INTEGER DEFAULT 0,
  rework_generated BOOLEAN DEFAULT false,
  blocked_tasks_by_quality INTEGER DEFAULT 0,
  rejected_quantity NUMERIC DEFAULT 0,
  reexecuted_quantity NUMERIC DEFAULT 0,
  quality_status TEXT DEFAULT 'approved' CHECK (quality_status IN ('approved', 'rejected', 'partial')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. daily_report_safety
CREATE TABLE public.daily_report_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  incidents_count INTEGER DEFAULT 0,
  near_misses_count INTEGER DEFAULT 0,
  interdicted_workfronts_count INTEGER DEFAULT 0,
  stoppages_due_safety INTEGER DEFAULT 0,
  lost_hours_due_safety NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. daily_report_client_inspection
CREATE TABLE public.daily_report_client_inspection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  pending_approvals_count INTEGER DEFAULT 0,
  releases_issued_count INTEGER DEFAULT 0,
  technical_pending_items TEXT,
  extraordinary_requests TEXT,
  scope_change_flag BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. task_progress_snapshots
CREATE TABLE public.task_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  schedule_task_id UUID NOT NULL REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  planned_progress_percent NUMERIC DEFAULT 0,
  actual_progress_percent NUMERIC DEFAULT 0,
  projected_progress_percent NUMERIC DEFAULT 0,
  delay_days INTEGER DEFAULT 0,
  status_flag TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. project_progress_snapshots
CREATE TABLE public.project_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  planned_global_progress NUMERIC DEFAULT 0,
  actual_global_progress NUMERIC DEFAULT 0,
  projected_global_progress NUMERIC DEFAULT 0,
  physical_deviation NUMERIC DEFAULT 0,
  schedule_deviation_days INTEGER DEFAULT 0,
  health_status TEXT DEFAULT 'on_track' CHECK (health_status IN ('on_track', 'at_risk', 'delayed', 'critical')),
  probable_completion_date DATE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. project_milestones
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  related_task_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  planned_date DATE,
  forecast_date DATE,
  actual_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'forecasted', 'achieved', 'delayed')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. financial_milestones
CREATE TABLE public.financial_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  related_task_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('billing', 'receipt', 'supplier_payment', 'retention_release')),
  description TEXT NOT NULL,
  trigger_mode TEXT NOT NULL DEFAULT 'date' CHECK (trigger_mode IN ('date', 'progress', 'task_completion', 'manual')),
  trigger_progress_percent NUMERIC,
  planned_date DATE,
  forecast_date DATE,
  actual_date DATE,
  planned_amount NUMERIC DEFAULT 0,
  forecast_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'forecasted', 'triggered', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. financial_alerts
CREATE TABLE public.financial_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  related_milestone_id UUID REFERENCES public.financial_milestones(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  explanation_json JSONB DEFAULT '{}',
  dedupe_key TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. task_productivity_history
CREATE TABLE public.task_productivity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  schedule_task_id UUID NOT NULL REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  planned_productivity NUMERIC,
  actual_productivity NUMERIC,
  average_actual_productivity NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. task_reforecast
CREATE TABLE public.task_reforecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  schedule_task_id UUID NOT NULL REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE,
  reference_daily_report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL,
  previous_forecast_end DATE,
  new_forecast_end DATE,
  previous_remaining_duration_days INTEGER,
  new_remaining_duration_days INTEGER,
  delay_classification TEXT CHECK (delay_classification IN ('recoverable', 'structural', 'critical')),
  reason_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. schedule_audit_log
CREATE TABLE public.schedule_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'axia')),
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_schedule_versions_obra ON public.project_schedule_versions(obra_id);
CREATE INDEX idx_schedule_tasks_version ON public.project_schedule_tasks(schedule_version_id);
CREATE INDEX idx_schedule_tasks_obra ON public.project_schedule_tasks(obra_id);
CREATE INDEX idx_schedule_tasks_parent ON public.project_schedule_tasks(parent_task_id);
CREATE INDEX idx_schedule_deps_pred ON public.project_schedule_dependencies(predecessor_task_id);
CREATE INDEX idx_schedule_deps_succ ON public.project_schedule_dependencies(successor_task_id);
CREATE INDEX idx_daily_reports_obra_date ON public.daily_reports(obra_id, report_date);
CREATE INDEX idx_daily_report_activities_report ON public.daily_report_activities(daily_report_id);
CREATE INDEX idx_daily_report_activities_task ON public.daily_report_activities(schedule_task_id);
CREATE INDEX idx_daily_report_productions_report ON public.daily_report_productions(daily_report_id);
CREATE INDEX idx_daily_report_constraints_report ON public.daily_report_constraints(daily_report_id);
CREATE INDEX idx_task_progress_snapshots_task ON public.task_progress_snapshots(schedule_task_id, snapshot_date);
CREATE INDEX idx_project_progress_snapshots_obra ON public.project_progress_snapshots(obra_id, snapshot_date);
CREATE INDEX idx_financial_milestones_obra ON public.financial_milestones(obra_id);
CREATE INDEX idx_financial_alerts_obra ON public.financial_alerts(obra_id, status);
CREATE INDEX idx_financial_alerts_dedupe ON public.financial_alerts(dedupe_key);
CREATE INDEX idx_task_productivity_task ON public.task_productivity_history(schedule_task_id);
CREATE INDEX idx_task_reforecast_task ON public.task_reforecast(schedule_task_id);
CREATE INDEX idx_schedule_audit_entity ON public.schedule_audit_log(entity_type, entity_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.project_schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_schedule_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_labor_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_equipment_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_client_inspection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_productivity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reforecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies using get_org_member_ids() pattern
-- project_schedule_versions
CREATE POLICY "org_select" ON public.project_schedule_versions FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.project_schedule_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.project_schedule_versions FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.project_schedule_versions FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- project_schedule_tasks
CREATE POLICY "org_select" ON public.project_schedule_tasks FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.project_schedule_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.project_schedule_tasks FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.project_schedule_tasks FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- project_schedule_dependencies
CREATE POLICY "org_select" ON public.project_schedule_dependencies FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.project_schedule_dependencies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.project_schedule_dependencies FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.project_schedule_dependencies FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_reports
CREATE POLICY "org_select" ON public.daily_reports FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.daily_reports FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.daily_reports FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_activities
CREATE POLICY "org_select" ON public.daily_report_activities FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.daily_report_activities FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.daily_report_activities FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_productions
CREATE POLICY "org_select" ON public.daily_report_productions FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_productions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_delete" ON public.daily_report_productions FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_labor_resources
CREATE POLICY "org_select" ON public.daily_report_labor_resources FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_labor_resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_delete" ON public.daily_report_labor_resources FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_equipment_resources
CREATE POLICY "org_select" ON public.daily_report_equipment_resources FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_equipment_resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_delete" ON public.daily_report_equipment_resources FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_materials
CREATE POLICY "org_select" ON public.daily_report_materials FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_delete" ON public.daily_report_materials FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_constraints
CREATE POLICY "org_select" ON public.daily_report_constraints FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_constraints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.daily_report_constraints FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.daily_report_constraints FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_quality
CREATE POLICY "org_select" ON public.daily_report_quality FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_quality FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_delete" ON public.daily_report_quality FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_safety
CREATE POLICY "org_select" ON public.daily_report_safety FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_safety FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_delete" ON public.daily_report_safety FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- daily_report_client_inspection
CREATE POLICY "org_select" ON public.daily_report_client_inspection FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.daily_report_client_inspection FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_delete" ON public.daily_report_client_inspection FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- task_progress_snapshots
CREATE POLICY "org_select" ON public.task_progress_snapshots FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.task_progress_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- project_progress_snapshots
CREATE POLICY "org_select" ON public.project_progress_snapshots FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.project_progress_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- project_milestones
CREATE POLICY "org_select" ON public.project_milestones FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.project_milestones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.project_milestones FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.project_milestones FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- financial_milestones
CREATE POLICY "org_select" ON public.financial_milestones FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.financial_milestones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.financial_milestones FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_delete" ON public.financial_milestones FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- financial_alerts
CREATE POLICY "org_select" ON public.financial_alerts FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.financial_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update" ON public.financial_alerts FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));

-- task_productivity_history
CREATE POLICY "org_select" ON public.task_productivity_history FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.task_productivity_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- task_reforecast
CREATE POLICY "org_select" ON public.task_reforecast FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.task_reforecast FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- schedule_audit_log
CREATE POLICY "org_select" ON public.schedule_audit_log FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "org_insert" ON public.schedule_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER update_schedule_versions_updated_at BEFORE UPDATE ON public.project_schedule_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schedule_tasks_updated_at BEFORE UPDATE ON public.project_schedule_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_report_activities_updated_at BEFORE UPDATE ON public.daily_report_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_report_constraints_updated_at BEFORE UPDATE ON public.daily_report_constraints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financial_milestones_updated_at BEFORE UPDATE ON public.financial_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
