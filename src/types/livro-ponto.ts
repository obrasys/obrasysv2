export type CompensationType = "salary" | "hourly";

export interface Worker {
  id: string;
  user_id: string;
  employee_code: string | null;
  full_name: string;
  role: string | null;
  employment_type: string;
  default_hourly_cost: number;
  default_daily_cost: number;
  overtime_hourly_cost: number;
  compensation_type: CompensationType;
  monthly_salary: number;
  hourly_rate: number;
  unit_rate_m2: number;
  unit_rate_ml: number;
  nif: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  subempreiteiro_id: string | null;
  equipa_membro_id: string | null;
  created_at: string;
  updated_at: string;
  subempreiteiro?: { id: string; nome: string };
  equipa_membro?: { id: string; nome: string };
}

export interface Timesheet {
  id: string;
  user_id: string;
  worker_id: string;
  work_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  break_minutes: number;
  total_worked_minutes: number;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  worker?: Worker;
  allocations?: TimesheetAllocation[];
}

export interface TimesheetAllocation {
  id: string;
  user_id: string;
  timesheet_id: string;
  worker_id: string;
  obra_id: string;
  rdo_id: string | null;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  worked_minutes: number;
  hourly_cost_snapshot: number;
  cost_amount: number;
  cost_type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  worker?: Worker;
  obras?: { id: string; nome: string };
}

export interface ProjectLaborCostEntry {
  id: string;
  user_id: string;
  obra_id: string;
  worker_id: string;
  timesheet_allocation_id: string | null;
  entry_date: string;
  hours_worked: number;
  hourly_cost: number;
  amount: number;
  status: string;
  origin_type: string;
  created_at: string;
  updated_at: string;
}

export type TimesheetStatus = "draft" | "submitted" | "approved" | "locked";
export type CostType = "regular" | "overtime" | "night" | "weekend";

export interface AllocationFormData {
  obra_id: string;
  start_time: string;
  end_time: string;
  worked_minutes: number;
  cost_type: CostType;
  description: string;
  rdo_id?: string;
}

export interface TimesheetFormData {
  worker_id: string;
  work_date: string;
  check_in_time?: string;
  check_out_time?: string;
  break_minutes: number;
  notes?: string;
  allocations: AllocationFormData[];
}
