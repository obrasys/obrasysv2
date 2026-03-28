import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ProjectDailyPlan, ProjectDailyPlanTask, DailyPlanTaskStatus } from '@/types/daily-plans';

export function useDailyPlan(projectId: string | undefined, date: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['daily-plan', projectId, date];

  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('project_daily_plans')
        .select('*')
        .eq('project_id', projectId)
        .eq('plan_date', date)
        .maybeSingle();
      if (error) throw error;
      return data as ProjectDailyPlan | null;
    },
    enabled: !!projectId && !!user && !!date,
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['daily-plan-tasks', projectId, date],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_daily_plan_tasks')
        .select('*, assigned_worker:equipa_membros(id, nome)')
        .eq('project_id', projectId)
        .eq('plan_date', date)
        .order('planned_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ProjectDailyPlanTask[];
    },
    enabled: !!projectId && !!user && !!date,
  });

  const ensurePlan = async (): Promise<string> => {
    if (plan) return plan.id;
    if (!user || !projectId) throw new Error('Missing user or project');
    const { data, error } = await supabase
      .from('project_daily_plans')
      .insert({
        user_id: user.id,
        project_id: projectId,
        plan_date: date,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
    return data.id;
  };

  const addTask = useMutation({
    mutationFn: async (task: { title: string; area_or_zone?: string; priority?: string; assigned_worker_id?: string; notes?: string }) => {
      if (!user || !projectId) throw new Error('Missing context');
      const planId = await ensurePlan();
      const nextOrder = (tasks?.length || 0) + 1;
      const { data, error } = await supabase
        .from('project_daily_plan_tasks')
        .insert({
          user_id: user.id,
          daily_plan_id: planId,
          project_id: projectId,
          plan_date: date,
          title: task.title,
          area_or_zone: task.area_or_zone || null,
          priority: task.priority || 'normal',
          assigned_worker_id: task.assigned_worker_id || null,
          notes: task.notes || null,
          planned_order: nextOrder,
        })
        .select('*, assigned_worker:equipa_membros(id, nome)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan-tasks', projectId, date] });
      toast({ title: 'Tarefa adicionada ao plano do dia' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao adicionar tarefa', description: e.message, variant: 'destructive' });
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: DailyPlanTaskStatus }) => {
      const { error } = await supabase
        .from('project_daily_plan_tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan-tasks', projectId, date] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<ProjectDailyPlanTask> }) => {
      const { error } = await supabase
        .from('project_daily_plan_tasks')
        .update(data as any)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan-tasks', projectId, date] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('project_daily_plan_tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan-tasks', projectId, date] });
      toast({ title: 'Tarefa removida' });
    },
  });

  const duplicateToDate = useMutation({
    mutationFn: async ({ taskId, targetDate }: { taskId: string; targetDate: string }) => {
      if (!user || !projectId) throw new Error('Missing context');
      const task = tasks?.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      // Ensure plan exists for target date
      let targetPlanId: string;
      const { data: existingPlan } = await supabase
        .from('project_daily_plans')
        .select('id')
        .eq('project_id', projectId)
        .eq('plan_date', targetDate)
        .maybeSingle();
      
      if (existingPlan) {
        targetPlanId = existingPlan.id;
      } else {
        const { data: newPlan, error } = await supabase
          .from('project_daily_plans')
          .insert({ user_id: user.id, project_id: projectId, plan_date: targetDate, status: 'active', created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        targetPlanId = newPlan.id;
      }

      const { error } = await supabase
        .from('project_daily_plan_tasks')
        .insert({
          user_id: user.id,
          daily_plan_id: targetPlanId,
          project_id: projectId,
          plan_date: targetDate,
          title: task.title,
          area_or_zone: task.area_or_zone,
          discipline: task.discipline,
          priority: task.priority,
          notes: task.notes,
          assigned_worker_id: task.assigned_worker_id,
          planned_order: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Tarefa duplicada' });
    },
  });

  const taskStats = {
    total: tasks?.length || 0,
    planned: tasks?.filter(t => t.status === 'planned').length || 0,
    inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    done: tasks?.filter(t => t.status === 'done').length || 0,
    blocked: tasks?.filter(t => t.status === 'blocked').length || 0,
  };

  return {
    plan,
    tasks,
    taskStats,
    isLoading: loadingPlan || loadingTasks,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    duplicateToDate,
  };
}
