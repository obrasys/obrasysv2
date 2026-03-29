import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useScheduleTasks } from '@/hooks/useSchedule';
import { AlertTriangle, CheckCircle2, Clock, Pause, TrendingDown, TrendingUp } from 'lucide-react';
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

  const delayClassLabels: Record<string, { label: string; className: string }> = {
    recoverable: { label: 'Recuperável', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    structural: { label: 'Estrutural', className: 'bg-orange-100 text-orange-800 border-orange-200' },
    critical: { label: 'Crítico', className: 'bg-red-100 text-red-800 border-red-200' },
  };

  const getDelay = (task: ScheduleTask) => {
    if (!task.planned_end) return 0;
    const end = task.actual_end || task.forecast_end || new Date().toISOString();
    const diff = Math.ceil((new Date(end).getTime() - new Date(task.planned_end).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getProductivityIndicator = (task: ScheduleTask) => {
    if (task.actual_progress_percent <= 0 || task.planned_progress_percent <= 0) return null;
    const ratio = task.actual_progress_percent / task.planned_progress_percent;
    if (ratio >= 1.05) return { icon: <TrendingUp className="h-3 w-3 text-green-600" />, label: 'Acima do plano' };
    if (ratio >= 0.90) return { icon: <Clock className="h-3 w-3 text-amber-500" />, label: 'Dentro do plano' };
    return { icon: <TrendingDown className="h-3 w-3 text-red-600" />, label: 'Abaixo do plano' };
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

  const suspendedCount = tasks?.filter(t => t.status_flag === 'suspended').length || 0;
  const delayedCount = tasks?.filter(t => getDelay(t) > 0).length || 0;
  const completedCount = tasks?.filter(t => t.status_flag === 'completed').length || 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{tasks?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total de tarefas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className={`text-2xl font-bold ${delayedCount > 0 ? 'text-amber-600' : ''}`}>{delayedCount}</p>
            <p className="text-xs text-muted-foreground">Atrasadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className={`text-2xl font-bold ${suspendedCount > 0 ? 'text-red-600' : ''}`}>{suspendedCount}</p>
            <p className="text-xs text-muted-foreground">Bloqueadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Blocked fronts */}
      {suspendedCount > 0 && (
        <Card className="border-red-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">
                {suspendedCount} frente(s) bloqueada(s)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cronograma Real</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">Estado</TableHead>
                  <TableHead className="min-w-[180px]">Tarefa</TableHead>
                  <TableHead>Início real</TableHead>
                  <TableHead>Fim real/prev.</TableHead>
                  <TableHead className="text-center">Progresso</TableHead>
                  <TableHead className="text-center">Atraso</TableHead>
                  <TableHead className="text-center">Classificação</TableHead>
                  <TableHead className="w-[30px]">Prod.</TableHead>
                  <TableHead className="min-w-[100px]">Barra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">A carregar...</TableCell>
                  </TableRow>
                ) : !tasks?.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sem tarefas.</TableCell>
                  </TableRow>
                ) : (
                  tasks.map(task => {
                    const delay = getDelay(task);
                    const prodIndicator = getProductivityIndicator(task);
                    const delayClass = task.delay_classification ? delayClassLabels[task.delay_classification] : null;

                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>{statusIcons[task.status_flag]}</TooltipTrigger>
                              <TooltipContent>{statusLabels[task.status_flag]}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {task.name}
                          {task.wbs_code && <span className="text-xs text-muted-foreground ml-1">({task.wbs_code})</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.actual_start ? format(new Date(task.actual_start), 'dd/MM/yy') : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.actual_end
                            ? format(new Date(task.actual_end), 'dd/MM/yy')
                            : task.forecast_end
                              ? <span className="text-amber-600">{format(new Date(task.forecast_end), 'dd/MM/yy')}</span>
                              : '-'
                          }
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
                        <TableCell className="text-center">
                          {delayClass && (
                            <Badge variant="outline" className={`text-[10px] ${delayClass.className}`}>
                              {delayClass.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {prodIndicator && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>{prodIndicator.icon}</TooltipTrigger>
                                <TooltipContent>{prodIndicator.label}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
