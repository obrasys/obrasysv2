export type DailyPlanStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type DailyPlanTaskStatus = 'planned' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
export type DailyPlanTaskPriority = 'low' | 'normal' | 'high';

export interface ProjectDailyPlan {
  id: string;
  user_id: string;
  project_id: string;
  plan_date: string;
  title: string | null;
  notes: string | null;
  status: DailyPlanStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDailyPlanTask {
  id: string;
  user_id: string;
  daily_plan_id: string;
  project_id: string;
  plan_date: string;
  title: string;
  description: string | null;
  area_or_zone: string | null;
  discipline: string | null;
  assigned_worker_id: string | null;
  priority: DailyPlanTaskPriority;
  status: DailyPlanTaskStatus;
  planned_order: number;
  planned_start_time: string | null;
  planned_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  notes: string | null;
  linked_rdo_entry_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_worker?: {
    id: string;
    nome: string;
  } | null;
}

export const DAILY_PLAN_STATUS_CONFIG: Record<DailyPlanStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  active: { label: 'Ativo', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
};

export const TASK_STATUS_CONFIG: Record<DailyPlanTaskStatus, { label: string; color: string; icon: string }> = {
  planned: { label: 'Planeada', color: 'bg-muted text-muted-foreground', icon: '📋' },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-100 text-blue-700', icon: '🔨' },
  done: { label: 'Concluída', color: 'bg-green-100 text-green-700', icon: '✅' },
  blocked: { label: 'Bloqueada', color: 'bg-amber-100 text-amber-700', icon: '🚫' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: '❌' },
};

export const TASK_PRIORITY_CONFIG: Record<DailyPlanTaskPriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
};
