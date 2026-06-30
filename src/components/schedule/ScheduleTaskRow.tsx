import { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ChevronRight } from 'lucide-react';
import type { ScheduleTask } from '@/types/schedule';
import { format, differenceInCalendarDays, addDays } from 'date-fns';

interface Props {
  task: ScheduleTask;
  level: number;
  minDate: Date;
  totalDays: number;
  onUpdate: (data: Partial<ScheduleTask>) => void;
  onDelete: () => void;
}

const toInputDate = (d?: string | null) => (d ? format(new Date(d), 'yyyy-MM-dd') : '');
const fromInputDate = (s: string) => (s ? new Date(s).toISOString() : null);

export function ScheduleTaskRow({ task, level, minDate, totalDays, onUpdate, onDelete }: Props) {
  const typeColors: Record<string, string> = {
    phase: 'bg-primary/20 text-primary',
    task: 'bg-muted text-muted-foreground',
    milestone: 'bg-accent text-accent-foreground',
  };

  const [name, setName] = useState(task.name);
  const [pStart, setPStart] = useState(toInputDate(task.planned_start));
  const [pEnd, setPEnd] = useState(toInputDate(task.planned_end));
  const [days, setDays] = useState<string>(task.planned_duration_days?.toString() ?? '');
  const [weightStr, setWeightStr] = useState<string>(
    ((task.weight_financial ?? task.weight_physical ?? 1) as number).toString()
  );
  const [plannedPct, setPlannedPct] = useState<string>(task.planned_progress_percent.toString());
  const [actualPct, setActualPct] = useState<string>(task.actual_progress_percent.toString());

  useEffect(() => { setName(task.name); }, [task.name]);
  useEffect(() => { setPStart(toInputDate(task.planned_start)); }, [task.planned_start]);
  useEffect(() => { setPEnd(toInputDate(task.planned_end)); }, [task.planned_end]);
  useEffect(() => { setDays(task.planned_duration_days?.toString() ?? ''); }, [task.planned_duration_days]);

  const commit = (data: Partial<ScheduleTask>) => onUpdate(data);

  const handleStartChange = (v: string) => {
    setPStart(v);
    const patch: Partial<ScheduleTask> = { planned_start: fromInputDate(v) };
    if (v && pEnd) {
      patch.planned_duration_days = Math.max(1, differenceInCalendarDays(new Date(pEnd), new Date(v)));
    }
    commit(patch);
  };
  const handleEndChange = (v: string) => {
    setPEnd(v);
    const patch: Partial<ScheduleTask> = { planned_end: fromInputDate(v) };
    if (v && pStart) {
      patch.planned_duration_days = Math.max(1, differenceInCalendarDays(new Date(v), new Date(pStart)));
    }
    commit(patch);
  };
  const handleDaysChange = (v: string) => {
    setDays(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n > 0) {
      const patch: Partial<ScheduleTask> = { planned_duration_days: n };
      if (pStart) {
        const newEnd = addDays(new Date(pStart), n);
        patch.planned_end = newEnd.toISOString();
        setPEnd(format(newEnd, 'yyyy-MM-dd'));
      }
      commit(patch);
    }
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

  return (
    <TableRow className={task.task_type === 'phase' ? 'bg-muted/60 font-bold' : ''}>
      <TableCell>
        <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
          {task.task_type === 'phase' && <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />}
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => { if (name !== task.name) commit({ name }); }}
            className="h-7 text-sm border-transparent hover:border-input focus:border-input px-2 bg-transparent"
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Select value={task.task_type} onValueChange={(v) => commit({ task_type: v as any })}>
          <SelectTrigger className={`h-6 px-1.5 border-none text-[10px] w-auto ${typeColors[task.task_type]}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phase">Fase</SelectItem>
            <SelectItem value="task">Tarefa</SelectItem>
            <SelectItem value="milestone">Marco</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input type="date" value={pStart} onChange={e => handleStartChange(e.target.value)}
          className="h-7 text-xs px-1 border-transparent hover:border-input focus:border-input" />
      </TableCell>
      <TableCell>
        <Input type="date" value={pEnd} onChange={e => handleEndChange(e.target.value)}
          className="h-7 text-xs px-1 border-transparent hover:border-input focus:border-input" />
      </TableCell>
      <TableCell className="text-center">
        <Input type="number" min="1" value={days}
          onChange={e => setDays(e.target.value)}
          onBlur={() => handleDaysChange(days)}
          className="h-7 text-xs text-center px-1 border-transparent hover:border-input focus:border-input" />
      </TableCell>
      <TableCell className="text-center">
        <Input type="number" step="0.1" min="0" value={weightStr}
          onChange={e => setWeightStr(e.target.value)}
          onBlur={() => {
            const n = parseFloat(weightStr);
            if (!isNaN(n)) commit({ weight_physical: n, weight_financial: n });
          }}
          className="h-7 text-xs text-center px-1 border-transparent hover:border-input focus:border-input" />
      </TableCell>
      <TableCell className="text-center">
        <Input type="number" min="0" max="100" value={plannedPct}
          onChange={e => setPlannedPct(e.target.value)}
          onBlur={() => {
            const n = parseFloat(plannedPct);
            if (!isNaN(n)) commit({ planned_progress_percent: Math.min(100, Math.max(0, n)) });
          }}
          className="h-7 text-xs text-center px-1 border-transparent hover:border-input focus:border-input" />
      </TableCell>
      <TableCell className="text-center">
        <Input type="number" min="0" max="100" value={actualPct}
          onChange={e => setActualPct(e.target.value)}
          onBlur={() => {
            const n = parseFloat(actualPct);
            if (!isNaN(n)) commit({ actual_progress_percent: Math.min(100, Math.max(0, n)) });
          }}
          className={`h-7 text-xs text-center px-1 border-transparent hover:border-input focus:border-input font-medium ${
            task.actual_progress_percent >= task.planned_progress_percent ? 'text-green-600' : 'text-red-600'
          }`} />
      </TableCell>
      <TableCell>
        <div className="relative h-6 bg-muted/50 rounded overflow-hidden">
          {plannedBar && (
            <div className="absolute top-0 h-3 bg-primary/30 rounded-sm" style={plannedBar} />
          )}
          {actualBar && (
            <div className="absolute bottom-0 h-3 bg-green-500/70 rounded-sm" style={actualBar} />
          )}
          {task.task_type === 'milestone' && plannedBar && (
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rotate-45"
              style={{ left: plannedBar.left }} />
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
