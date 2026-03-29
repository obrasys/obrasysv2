import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Bell,
  Clock,
  Flame,
  TrendingDown,
  PauseCircle,
  CalendarX2,
  GitMerge,
  Zap,
} from 'lucide-react';
import type { ScheduleTask, ScheduleDependency } from '@/types/schedule';

interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  title: string;
  description: string;
  taskNames: string[];
}

interface Props {
  tasks: ScheduleTask[];
  dependencies: ScheduleDependency[];
}

export function SmartAlertsPanel({ tasks, dependencies }: Props) {
  const alerts = useMemo(() => {
    const result: Alert[] = [];

    // 1. Tasks with accelerating deviation (progress dropping faster)
    const acceleratingDeviations = tasks.filter(t => {
      if (t.status_flag === 'completed' || t.status_flag === 'not_started') return false;
      const deviation = t.actual_progress_percent - t.planned_progress_percent;
      return deviation < -15;
    });
    if (acceleratingDeviations.length > 0) {
      result.push({
        id: 'accelerating-deviation',
        severity: 'critical',
        icon: <TrendingDown className="h-4 w-4" />,
        title: 'Desvio acelerado detetado',
        description: `${acceleratingDeviations.length} tarefa(s) com desvio superior a 15% entre progresso planeado e real. O atraso está a agravar-se.`,
        taskNames: acceleratingDeviations.map(t => t.name),
      });
    }

    // 2. Tasks in progress with 0% progress (stalled)
    const stalledTasks = tasks.filter(t => {
      if (t.status_flag !== 'in_progress' && t.status_flag !== 'started') return false;
      return t.actual_progress_percent === 0;
    });
    if (stalledTasks.length > 0) {
      result.push({
        id: 'stalled-tasks',
        severity: 'high',
        icon: <PauseCircle className="h-4 w-4" />,
        title: 'Tarefas iniciadas sem progresso',
        description: `${stalledTasks.length} tarefa(s) marcada(s) como iniciadas mas ainda com 0% de progresso. Possível bloqueio não reportado.`,
        taskNames: stalledTasks.map(t => t.name),
      });
    }

    // 3. Suspended tasks (blocked fronts)
    const suspendedTasks = tasks.filter(t => t.status_flag === 'suspended');
    if (suspendedTasks.length > 0) {
      result.push({
        id: 'suspended',
        severity: 'high',
        icon: <Flame className="h-4 w-4" />,
        title: 'Frentes de trabalho bloqueadas',
        description: `${suspendedTasks.length} tarefa(s) suspensa(s). Cada dia de bloqueio pode impactar tarefas sucessoras.`,
        taskNames: suspendedTasks.map(t => t.name),
      });
    }

    // 4. Critical path delays
    const criticalDelays = tasks.filter(t => {
      if (t.criticality !== 'critical') return false;
      if (!t.planned_end || !t.forecast_end) return false;
      return new Date(t.forecast_end) > new Date(t.planned_end);
    });
    if (criticalDelays.length > 0) {
      result.push({
        id: 'critical-path-delay',
        severity: 'critical',
        icon: <Zap className="h-4 w-4" />,
        title: 'Atraso no caminho crítico',
        description: `${criticalDelays.length} tarefa(s) do caminho crítico atrasada(s). O prazo final da obra está em risco direto.`,
        taskNames: criticalDelays.map(t => t.name),
      });
    }

    // 5. Dependency chains amplifying delays
    const chainAlerts: string[] = [];
    for (const dep of dependencies) {
      const pred = tasks.find(t => t.id === dep.predecessor_task_id);
      const succ = tasks.find(t => t.id === dep.successor_task_id);
      if (!pred || !succ) continue;
      if (pred.status_flag === 'completed') continue;
      if (!pred.planned_end || !pred.forecast_end) continue;
      const predDelay = Math.ceil(
        (new Date(pred.forecast_end).getTime() - new Date(pred.planned_end).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (predDelay > 5 && succ.status_flag === 'not_started') {
        chainAlerts.push(`"${pred.name}" → "${succ.name}" (+${predDelay}d)`);
      }
    }
    if (chainAlerts.length > 0) {
      result.push({
        id: 'chain-impact',
        severity: 'medium',
        icon: <GitMerge className="h-4 w-4" />,
        title: 'Propagação de atrasos em cadeia',
        description: `${chainAlerts.length} dependência(s) com atrasos a propagar-se para tarefas ainda não iniciadas.`,
        taskNames: chainAlerts,
      });
    }

    // 6. Tasks past planned end without completion
    const overdueTasks = tasks.filter(t => {
      if (t.status_flag === 'completed') return false;
      if (!t.planned_end) return false;
      return new Date(t.planned_end) < new Date() && t.actual_progress_percent < 100;
    });
    if (overdueTasks.length > 0) {
      result.push({
        id: 'overdue',
        severity: 'medium',
        icon: <CalendarX2 className="h-4 w-4" />,
        title: 'Tarefas com prazo expirado',
        description: `${overdueTasks.length} tarefa(s) ultrapassaram o prazo planeado sem conclusão.`,
        taskNames: overdueTasks.map(t => t.name),
      });
    }

    // 7. Tasks approaching deadline (within 3 days) with low progress
    const approachingDeadline = tasks.filter(t => {
      if (t.status_flag === 'completed') return false;
      if (!t.planned_end) return false;
      const daysUntilEnd = Math.ceil(
        (new Date(t.planned_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilEnd > 0 && daysUntilEnd <= 3 && t.actual_progress_percent < 80;
    });
    if (approachingDeadline.length > 0) {
      result.push({
        id: 'approaching-deadline',
        severity: 'medium',
        icon: <Clock className="h-4 w-4" />,
        title: 'Prazos iminentes com baixo progresso',
        description: `${approachingDeadline.length} tarefa(s) terminam nos próximos 3 dias com progresso inferior a 80%.`,
        taskNames: approachingDeadline.map(t => `${t.name} (${t.actual_progress_percent}%)`),
      });
    }

    return result.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }, [tasks, dependencies]);

  if (alerts.length === 0) return null;

  const severityColors: Record<string, string> = {
    critical: 'border-red-300 bg-red-50 text-red-800',
    high: 'border-orange-300 bg-orange-50 text-orange-800',
    medium: 'border-amber-300 bg-amber-50 text-amber-800',
    low: 'border-blue-300 bg-blue-50 text-blue-800',
  };

  const severityLabels: Record<string, string> = {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Médio',
    low: 'Baixo',
  };

  return (
    <Card className="border-red-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-red-600" />
          Alertas Inteligentes
          <Badge variant="destructive" className="ml-auto text-[10px]">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${severityColors[alert.severity]}`}
          >
            <div className="shrink-0 mt-0.5">{alert.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold">{alert.title}</span>
                <Badge variant="outline" className={`text-[9px] px-1 ${severityColors[alert.severity]}`}>
                  {severityLabels[alert.severity]}
                </Badge>
              </div>
              <p className="text-xs opacity-80">{alert.description}</p>
              {alert.taskNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {alert.taskNames.slice(0, 5).map((name, i) => (
                    <span key={i} className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded">
                      {name}
                    </span>
                  ))}
                  {alert.taskNames.length > 5 && (
                    <span className="text-[10px] opacity-60">+{alert.taskNames.length - 5} mais</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
