
-- 1. Workers
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  employee_code TEXT,
  full_name TEXT NOT NULL,
  role TEXT,
  employment_type TEXT DEFAULT 'full_time',
  default_hourly_cost NUMERIC DEFAULT 0,
  default_daily_cost NUMERIC DEFAULT 0,
  overtime_hourly_cost NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_workers" ON public.workers FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_insert_workers" ON public.workers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "org_update_workers" ON public.workers FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_delete_workers" ON public.workers FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Timesheets
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  check_in_time TIME,
  check_out_time TIME,
  break_minutes INTEGER DEFAULT 0,
  total_worked_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT timesheets_worker_date_unique UNIQUE (worker_id, work_date)
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_timesheets" ON public.timesheets FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_insert_timesheets" ON public.timesheets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "org_update_timesheets" ON public.timesheets FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_delete_timesheets" ON public.timesheets FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Timesheet Allocations
CREATE TABLE public.timesheet_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  rdo_id UUID,
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  worked_minutes INTEGER DEFAULT 0,
  hourly_cost_snapshot NUMERIC DEFAULT 0,
  cost_amount NUMERIC DEFAULT 0,
  cost_type TEXT DEFAULT 'regular',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.timesheet_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_ta" ON public.timesheet_allocations FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_insert_ta" ON public.timesheet_allocations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "org_update_ta" ON public.timesheet_allocations FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_delete_ta" ON public.timesheet_allocations FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_ta_updated_at BEFORE UPDATE ON public.timesheet_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Project Labor Cost Entries (Ledger)
CREATE TABLE public.project_labor_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  timesheet_allocation_id UUID REFERENCES public.timesheet_allocations(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  hours_worked NUMERIC DEFAULT 0,
  hourly_cost NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  origin_type TEXT DEFAULT 'timesheet',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_labor_cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_plce" ON public.project_labor_cost_entries FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_insert_plce" ON public.project_labor_cost_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "org_update_plce" ON public.project_labor_cost_entries FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()));
CREATE POLICY "own_delete_plce" ON public.project_labor_cost_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_plce_updated_at BEFORE UPDATE ON public.project_labor_cost_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
