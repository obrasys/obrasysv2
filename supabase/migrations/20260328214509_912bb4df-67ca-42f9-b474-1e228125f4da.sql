
-- Project Daily Plans
CREATE TABLE public.project_daily_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  title TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, plan_date)
);

ALTER TABLE public.project_daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org daily plans" ON public.project_daily_plans
  FOR ALL TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()))
  WITH CHECK (user_id = ANY(public.get_org_member_ids()));

CREATE TRIGGER update_project_daily_plans_updated_at
  BEFORE UPDATE ON public.project_daily_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project Daily Plan Tasks
CREATE TABLE public.project_daily_plan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  daily_plan_id UUID NOT NULL REFERENCES public.project_daily_plans(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  area_or_zone TEXT,
  discipline TEXT,
  assigned_worker_id UUID REFERENCES public.equipa_membros(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'blocked', 'cancelled')),
  planned_order INT NOT NULL DEFAULT 0,
  planned_start_time TIME,
  planned_end_time TIME,
  actual_start_time TIME,
  actual_end_time TIME,
  notes TEXT,
  linked_rdo_entry_id UUID REFERENCES public.relatorios_diarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_daily_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org daily plan tasks" ON public.project_daily_plan_tasks
  FOR ALL TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()))
  WITH CHECK (user_id = ANY(public.get_org_member_ids()));

CREATE TRIGGER update_project_daily_plan_tasks_updated_at
  BEFORE UPDATE ON public.project_daily_plan_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
