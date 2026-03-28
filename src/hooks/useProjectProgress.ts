import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ProjectProgressSnapshot } from '@/types/schedule';
import { calculateWeightedProgress } from '@/hooks/useSchedule';
import type { ScheduleTask } from '@/types/schedule';

export function useProjectProgress(obraId?: string, versionId?: string) {
  const { user } = useAuth();

  // Fetch tasks and calculate live progress
  const { data: tasks } = useQuery({
    queryKey: ['schedule-tasks', versionId],
    queryFn: async () => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('schedule_version_id', versionId)
        .is('parent_task_id', null); // Only leaf-level phases for weighted calc
      if (error) throw error;
      return data as ScheduleTask[];
    },
    enabled: !!user && !!versionId,
  });

  // Fetch historical snapshots for charts
  const { data: snapshots } = useQuery({
    queryKey: ['project-progress-snapshots', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('project_progress_snapshots')
        .select('*')
        .eq('obra_id', obraId)
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      return data as ProjectProgressSnapshot[];
    },
    enabled: !!user && !!obraId,
  });

  // Fetch all tasks (including children) for detailed view
  const { data: allTasks } = useQuery({
    queryKey: ['schedule-tasks-all', versionId],
    queryFn: async () => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('schedule_version_id', versionId)
        .order('sort_order');
      if (error) throw error;
      return data as ScheduleTask[];
    },
    enabled: !!user && !!versionId,
  });

  const progress = calculateWeightedProgress(tasks || []);

  // Calculate SPI
  const spi = progress.planned > 0 ? Math.round((progress.actual / progress.planned) * 100) / 100 : 1;

  // Find critical tasks (delayed or critical path)
  const criticalTasks = (allTasks || []).filter(t =>
    t.criticality === 'critical' ||
    (t.actual_progress_percent < t.planned_progress_percent && t.status_flag !== 'completed')
  );

  // Calculate delay in days
  const delayedTasks = (allTasks || []).filter(t =>
    t.forecast_end && t.planned_end && new Date(t.forecast_end) > new Date(t.planned_end)
  );

  const maxDelay = delayedTasks.reduce((max, t) => {
    if (!t.forecast_end || !t.planned_end) return max;
    const diff = Math.ceil((new Date(t.forecast_end).getTime() - new Date(t.planned_end).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(max, diff);
  }, 0);

  // Health status
  let healthStatus: 'on_track' | 'at_risk' | 'delayed' | 'critical' = 'on_track';
  if (progress.deviation < -15) healthStatus = 'critical';
  else if (progress.deviation < -10) healthStatus = 'delayed';
  else if (progress.deviation < -5) healthStatus = 'at_risk';

  return {
    progress,
    spi,
    criticalTasks,
    delayedTasks,
    maxDelay,
    healthStatus,
    snapshots,
    allTasks,
  };
}
