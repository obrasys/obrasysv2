import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useScheduleVersions, useScheduleTasks, useScheduleDependencies } from '@/hooks/useSchedule';
import { BaselineApprovalCard } from './BaselineApprovalCard';
import { ScheduleTaskRow } from './ScheduleTaskRow';
import { AxiaSchedulePanel } from './AxiaSchedulePanel';
import { DeviationExplainerCard } from './DeviationExplainerCard';
import { SmartAlertsPanel } from './SmartAlertsPanel';
import { Plus, CheckCircle2, Calendar, GitBranch } from 'lucide-react';
import type { ScheduleTask } from '@/types/schedule';

interface Props {
  obraId: string;
  obraNome?: string;
  orcamentoId?: string;
}

export function ScheduleGanttTable({ obraId, obraNome, orcamentoId }: Props) {
  const { versions, baseline, latestVersion, isLoading: loadingVersions, createVersion, approveBaseline } = useScheduleVersions(obraId);
  const activeVersionId = baseline?.id || latestVersion?.id;
  const { tasks, taskTree, isLoading: loadingTasks, createTask, updateTask, deleteTask } = useScheduleTasks(activeVersionId, obraId);
  const { dependencies } = useScheduleDependencies(obraId);

  // Date range for Gantt
  const allDates = (tasks || []).flatMap(t => [t.planned_start, t.planned_end, t.actual_start, t.actual_end].filter(Boolean) as string[]);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => new Date(d).getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : new Date();
  const totalDays = Math.max(Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)), 30);

  const flattenTree = (nodes: ScheduleTask[], level = 0): (ScheduleTask & { level: number })[] => {
    const result: (ScheduleTask & { level: number })[] = [];
    nodes.forEach(n => {
      result.push({ ...n, level });
      if (n.children?.length) result.push(...flattenTree(n.children, level + 1));
    });
    return result;
  };

  const flatTasks = flattenTree(taskTree);

  if (loadingVersions) return <div className="text-muted-foreground text-sm p-4">A carregar cronograma...</div>;

  return (
    <div className="space-y-4">
      {/* Baseline status */}
      {latestVersion && !baseline && (
        <BaselineApprovalCard
          version={latestVersion}
          onApprove={() => approveBaseline.mutate(latestVersion.id)}
          isApproving={approveBaseline.isPending}
        />
      )}

      {baseline && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span>Baseline aprovada — Versão {baseline.version_no}</span>
          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">Aprovada</Badge>
        </div>
      )}

      {/* Create schedule if none exists */}
      {!latestVersion && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum cronograma estimado encontrado.</p>
            <Button
              onClick={() => createVersion.mutate({ obra_id: obraId, source_budget_id: orcamentoId })}
              disabled={createVersion.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Cronograma Estimado
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Task table with Gantt bars */}
      {activeVersionId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Cronograma — Versão {latestVersion?.version_no}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => createTask.mutate({
                  schedule_version_id: activeVersionId,
                  obra_id: obraId,
                  name: 'Nova tarefa',
                  task_type: 'task',
                  sort_order: (tasks?.length || 0) + 1,
                })}
                disabled={createTask.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Tarefa
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Tarefa</TableHead>
                    <TableHead className="w-[60px] text-center">Tipo</TableHead>
                    <TableHead className="w-[90px]">Início</TableHead>
                    <TableHead className="w-[90px]">Fim</TableHead>
                    <TableHead className="w-[50px] text-center">Dias</TableHead>
                    <TableHead className="w-[70px] text-center">Peso</TableHead>
                    <TableHead className="w-[80px] text-center">Previsto</TableHead>
                    <TableHead className="w-[80px] text-center">Real</TableHead>
                    <TableHead className="min-w-[200px]">Gantt</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTasks ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        A carregar...
                      </TableCell>
                    </TableRow>
                  ) : flatTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Sem tarefas. Adicione a primeira tarefa do cronograma.
                      </TableCell>
                    </TableRow>
                  ) : (
                    flatTasks.map(task => (
                      <ScheduleTaskRow
                        key={task.id}
                        task={task}
                        level={task.level}
                        minDate={minDate}
                        totalDays={totalDays}
                        onUpdate={(data) => updateTask.mutate({ id: task.id, data })}
                        onDelete={() => deleteTask.mutate(task.id)}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Alerts */}
      {activeVersionId && tasks && tasks.length > 0 && (
        <SmartAlertsPanel tasks={tasks} dependencies={dependencies || []} />
      )}

      {/* Deviation Explainer */}
      {activeVersionId && tasks && tasks.length > 0 && (
        <DeviationExplainerCard
          tasks={tasks}
          dependencies={dependencies || []}
          obraNome={obraNome || 'Obra'}
        />
      )}

      {/* Axia AI Assistant */}
      {activeVersionId && tasks && tasks.length > 0 && (
        <AxiaSchedulePanel
          obraId={obraId}
          obraNome={obraNome || 'Obra'}
          tasks={tasks}
          dependencies={dependencies || []}
          hasBaseline={!!baseline}
        />
      )}
    </div>
  );
}
