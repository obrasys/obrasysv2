import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronRight } from 'lucide-react';
import type { ScheduleTask } from '@/types/schedule';
import { format } from 'date-fns';

interface Props {
  task: ScheduleTask;
  level: number;
  minDate: Date;
  totalDays: number;
  onUpdate: (data: Partial<ScheduleTask>) => void;
  onDelete: () => void;
}

export function ScheduleTaskRow({ task, level, minDate, totalDays, onUpdate, onDelete }: Props) {
  const typeColors: Record<string, string> = {
    phase: 'bg-primary/20 text-primary',
    task: 'bg-muted text-muted-foreground',
    milestone: 'bg-accent text-accent-foreground',
  };

  // Gantt bar calculations
  const plannedStart = task.planned_start ? new Date(task.planned_start) : null;
  const plannedEnd = task.planned_end ? new Date(task.planned_end) : null;
  const actualStart = task.actual_start ? new Date(task.actual_start) : null;
  const actualEnd = task.actual_end ? new Date(task.actual_end) : null;

  const getBarStyle = (start: Date | null, end: Date | null) => {
    if (!start || !end) return null;
    const startOffset = Math.max(0, (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const plannedBar = getBarStyle(plannedStart, plannedEnd);
  const actualBar = getBarStyle(actualStart, actualEnd || new Date());

  const weight = task.weight_financial ?? task.weight_physical ?? 1;

  return (
    <TableRow className={task.task_type === 'phase' ? 'bg-muted/60 font-bold' : ''}>
      <TableCell>
        <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
          {task.task_type === 'phase' && <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground" />}
          <span className="truncate text-sm">{task.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className={`text-[10px] px-1.5 ${typeColors[task.task_type]}`}>
          {task.task_type === 'phase' ? 'Fase' : task.task_type === 'milestone' ? 'Marco' : 'Tarefa'}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {task.planned_start ? format(new Date(task.planned_start), 'dd/MM/yy') : '-'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {task.planned_end ? format(new Date(task.planned_end), 'dd/MM/yy') : '-'}
      </TableCell>
      <TableCell className="text-center text-xs">
        {task.planned_duration_days || '-'}
      </TableCell>
      <TableCell className="text-center text-xs">
        {weight.toFixed(1)}
      </TableCell>
      <TableCell className="text-center">
        <span className="text-xs font-medium">{task.planned_progress_percent.toFixed(0)}%</span>
      </TableCell>
      <TableCell className="text-center">
        <span className={`text-xs font-medium ${
          task.actual_progress_percent >= task.planned_progress_percent ? 'text-green-600' : 'text-red-600'
        }`}>
          {task.actual_progress_percent.toFixed(0)}%
        </span>
      </TableCell>
      <TableCell>
        <div className="relative h-6 bg-muted/50 rounded overflow-hidden">
          {/* Planned bar */}
          {plannedBar && (
            <div
              className="absolute top-0 h-3 bg-primary/30 rounded-sm"
              style={plannedBar}
            />
          )}
          {/* Actual bar */}
          {actualBar && (
            <div
              className="absolute bottom-0 h-3 bg-green-500/70 rounded-sm"
              style={actualBar}
            />
          )}
          {/* Milestone diamond */}
          {task.task_type === 'milestone' && plannedBar && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rotate-45"
              style={{ left: plannedBar.left }}
            />
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete}>
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
