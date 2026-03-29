import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ScheduleVersion, ScheduleTask, ScheduleDependency, ScheduleTaskFormData } from '@/types/schedule';

export function useScheduleVersions(obraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: ['schedule-versions', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('project_schedule_versions')
        .select('*')
        .eq('obra_id', obraId)
        .order('version_no', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ScheduleVersion[];
    },
    enabled: !!user && !!obraId,
  });

  const baseline = versions?.find(v => v.is_baseline && v.approval_status === 'approved');
  const latestVersion = versions?.[0];

  const createVersion = useMutation({
    mutationFn: async (data: { obra_id: string; type?: string; source_budget_id?: string; notes?: string }) => {
      if (!user) throw new Error('Não autenticado');
      const nextNo = (versions?.length || 0) + 1;
      const { data: version, error } = await supabase
        .from('project_schedule_versions')
        .insert({
          user_id: user.id,
          obra_id: data.obra_id,
          version_no: nextNo,
          type: data.type || 'estimated',
          source_budget_id: data.source_budget_id,
          notes: data.notes,
          approval_status: 'draft',
          generated_by_type: 'user',
        })
        .select()
        .single();
      if (error) throw error;
      return version;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-versions', obraId] });
      toast({ title: 'Versão criada', description: 'Nova versão do cronograma criada.' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const approveBaseline = useMutation({
    mutationFn: async (versionId: string) => {
      if (!user) throw new Error('Não autenticado');
      // Remove baseline flag from all other versions of same obra
      if (obraId) {
        await supabase
          .from('project_schedule_versions')
          .update({ is_baseline: false })
          .eq('obra_id', obraId);
      }
      const { error } = await supabase
        .from('project_schedule_versions')
        .update({
          is_baseline: true,
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-versions', obraId] });
      toast({ title: 'Baseline aprovada', description: 'O cronograma foi aprovado como baseline.' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { versions, baseline, latestVersion, isLoading, createVersion, approveBaseline };
}

export function useScheduleTasks(versionId?: string, obraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['schedule-tasks', versionId],
    queryFn: async () => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('schedule_version_id', versionId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ScheduleTask[];
    },
    enabled: !!user && !!versionId,
  });

  // Build tree structure
  const taskTree = buildTaskTree(tasks || []);

  const createTask = useMutation({
    mutationFn: async (data: ScheduleTaskFormData & { schedule_version_id: string; obra_id: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { schedule_version_id, obra_id, ...taskData } = data;
      const { data: task, error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          ...taskData,
          user_id: user.id,
          obra_id,
          schedule_version_id,
        })
        .select()
        .single();
      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-tasks', versionId] });
      toast({ title: 'Tarefa criada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScheduleTask> }) => {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-tasks', versionId] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-tasks', versionId] });
      toast({ title: 'Tarefa eliminada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { tasks, taskTree, isLoading, createTask, updateTask, deleteTask };
}

export function useScheduleDependencies(obraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: dependencies, isLoading } = useQuery({
    queryKey: ['schedule-dependencies', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('project_schedule_dependencies')
        .select('*')
        .eq('obra_id', obraId);
      if (error) throw error;
      return data as ScheduleDependency[];
    },
    enabled: !!user && !!obraId,
  });

  const createDependency = useMutation({
    mutationFn: async (data: { obra_id: string; predecessor_task_id: string; successor_task_id: string; dependency_type?: string; lag_days?: number }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('project_schedule_dependencies')
        .insert({
          user_id: user.id,
          obra_id: data.obra_id,
          predecessor_task_id: data.predecessor_task_id,
          successor_task_id: data.successor_task_id,
          dependency_type: data.dependency_type || 'FS',
          lag_days: data.lag_days || 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-dependencies', obraId] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { dependencies, isLoading, createDependency };
}

// Helper: build hierarchical task tree
function buildTaskTree(tasks: ScheduleTask[]): ScheduleTask[] {
  const map = new Map<string, ScheduleTask>();
  const roots: ScheduleTask[] = [];

  tasks.forEach(t => map.set(t.id, { ...t, children: [], level: 0 }));

  map.forEach(task => {
    if (task.parent_task_id && map.has(task.parent_task_id)) {
      const parent = map.get(task.parent_task_id)!;
      task.level = (parent.level || 0) + 1;
      parent.children = parent.children || [];
      parent.children.push(task);
    } else {
      roots.push(task);
    }
  });

  return roots;
}

// Calculate weighted progress for a set of tasks
export function calculateWeightedProgress(tasks: ScheduleTask[]): {
  planned: number;
  actual: number;
  projected: number;
  deviation: number;
} {
  if (!tasks.length) return { planned: 0, actual: 0, projected: 0, deviation: 0 };

  let totalWeight = 0;
  let weightedPlanned = 0;
  let weightedActual = 0;
  let weightedProjected = 0;

  tasks.forEach(t => {
    // Priority: weight_financial > weight_physical > 1
    const weight = t.weight_financial ?? t.weight_physical ?? 1;
    totalWeight += weight;
    weightedPlanned += t.planned_progress_percent * weight;
    weightedActual += t.actual_progress_percent * weight;
    weightedProjected += t.projected_progress_percent * weight;
  });

  if (totalWeight === 0) return { planned: 0, actual: 0, projected: 0, deviation: 0 };

  const planned = weightedPlanned / totalWeight;
  const actual = weightedActual / totalWeight;
  const projected = weightedProjected / totalWeight;

  return {
    planned: Math.round(planned * 100) / 100,
    actual: Math.round(actual * 100) / 100,
    projected: Math.round(projected * 100) / 100,
    deviation: Math.round((actual - planned) * 100) / 100,
  };
}
