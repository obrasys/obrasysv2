import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useScheduleTasks } from '@/hooks/useSchedule';
import { AlertTriangle, CheckCircle2, Clock, Pause } from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduleTask } from '@/types/schedule';

interface Props {
  obraId: string;
  versionId?: string;
}

export function ExecutionTimeline({ obraId, versionId }: Props) {
  const { tasks, isLoading } = useScheduleTasks(versionId, obraId);

  const statusIcons: Record<string, React.ReactNode> = {
    not_started: <Clock className="h-3 w-3 text-muted-foreground" />,
    started: <Clock className="h-3 w-3 text-blue-500" />,
    in_progress: <Clock className="h-3 w-3 text-amber-500" />,
    suspended: <Pause className="h-3 w-3 text-red-500" />,
    completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  };

  const statusLabels: Record<string, string> = {
    not_started: 'Não iniciada',
    started: 'Iniciada',
    in_progress: 'Em curso',
    suspended: 'Suspensa',
    completed: 'Concluída',
  };

  const getDelay = (task: ScheduleTask) => {
    if (!task.planned_end) return 0;
    const end = task.actual_end || task.forecast_end || new Date().toISOString();
    const diff = Math.ceil((new Date(end).getTime() - new Date(task.planned_end).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (!versionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aprove uma baseline para ver a execução.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Blocked fronts */}
      {tasks?.filter(t => t.status_flag === 'suspended').length ? (
        <Card className="border-red-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">
                {tasks.filter(t => t.status_flag === 'suspended').length} frente(s) bloqueada(s)
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Execution table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cronograma Real</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead className="min-w-[200px]">Tarefa</TableHead>
                <TableHead>Início real</TableHead>
                <TableHead>Fim real</TableHead>
                <TableHead className="text-center">Progresso</TableHead>
                <TableHead className="text-center">Atraso (dias)</TableHead>
                <TableHead className="min-w-[100px]">Barra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell>
                </TableRow>
              ) : !tasks?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem tarefas.</TableCell>
                </TableRow>
              ) : (
                tasks.map(task => {
                  const delay = getDelay(task);
                  return (
                    <TableRow key={task.id}>
                      <TableCell>{statusIcons[task.status_flag]}</TableCell>
                      <TableCell className="text-sm font-medium">{task.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.actual_start ? format(new Date(task.actual_start), 'dd/MM/yy') : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.actual_end ? format(new Date(task.actual_end), 'dd/MM/yy') : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">{task.actual_progress_percent.toFixed(0)}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {delay > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{delay}d</Badge>
                        ) : (
                          <span className="text-xs text-green-600">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Progress value={task.actual_progress_percent} className="h-2" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
