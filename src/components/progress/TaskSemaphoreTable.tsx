import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ScheduleTask } from '@/types/schedule';

interface Props {
  tasks: ScheduleTask[];
}

export function TaskSemaphoreTable({ tasks }: Props) {
  // Only show non-child tasks (phases or root tasks)
  const visibleTasks = tasks.filter(t => !t.parent_task_id || t.task_type === 'phase');

  const getSemaphore = (task: ScheduleTask) => {
    const dev = task.actual_progress_percent - task.planned_progress_percent;
    if (task.status_flag === 'completed') return { color: 'bg-green-500', label: 'Concluída' };
    if (task.status_flag === 'suspended') return { color: 'bg-gray-400', label: 'Suspensa' };
    if (dev >= -2) return { color: 'bg-green-500', label: 'OK' };
    if (dev >= -10) return { color: 'bg-amber-500', label: 'Atenção' };
    return { color: 'bg-red-500', label: 'Atrasada' };
  };

  if (visibleTasks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Semáforo de Etapas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[30px] w-[30px]" />
              <TableHead className="min-w-[180px]">Etapa</TableHead>
              <TableHead className="w-[80px] text-center">Previsto</TableHead>
              <TableHead className="w-[80px] text-center">Real</TableHead>
              <TableHead className="w-[80px] text-center">Desvio</TableHead>
              <TableHead className="min-w-[120px]">Progresso</TableHead>
              <TableHead className="w-[80px]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTasks.map(task => {
              const sem = getSemaphore(task);
              const dev = task.actual_progress_percent - task.planned_progress_percent;
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className={`w-3 h-3 rounded-full ${sem.color}`} />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{task.name}</TableCell>
                  <TableCell className="text-center text-sm">{task.planned_progress_percent.toFixed(0)}%</TableCell>
                  <TableCell className="text-center text-sm font-medium">{task.actual_progress_percent.toFixed(0)}%</TableCell>
                  <TableCell className={`text-center text-sm font-medium ${dev >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dev > 0 ? '+' : ''}{dev.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Progress value={task.actual_progress_percent} className="h-2" />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{sem.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
