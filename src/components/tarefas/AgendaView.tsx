import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import type { Tarefa } from '@/types/tarefas';
import { PRIORIDADE_CONFIG, STATUS_CONFIG } from '@/types/tarefas';

interface AgendaViewProps {
  tarefas: Tarefa[];
  onEdit: (tarefa: Tarefa) => void;
  onToggleComplete: (tarefa: Tarefa) => void;
}

export function AgendaView({ tarefas, onEdit, onToggleComplete }: AgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Group tarefas by date
  const tarefasByDate = useMemo(() => {
    const map = new Map<string, Tarefa[]>();
    tarefas?.forEach(t => {
      if (t.data_agendada) {
        const key = t.data_agendada;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    });
    // Sort each day's tarefas by time
    map.forEach((list) => {
      list.sort((a, b) => {
        const ha = (a as any).hora_agendada || '99:99';
        const hb = (b as any).hora_agendada || '99:99';
        return ha.localeCompare(hb);
      });
    });
    return map;
  }, [tarefas]);

  // Dates that have tarefas (for calendar highlighting)
  const datesWithTarefas = useMemo(() => {
    const set = new Set<string>();
    tarefasByDate.forEach((_, key) => set.add(key));
    return set;
  }, [tarefasByDate]);

  // Tarefas for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const tarefasForDay = tarefasByDate.get(selectedDateStr) || [];

  // Upcoming tarefas (next 7 days from selected)
  const upcomingDays = useMemo(() => {
    const days: { date: Date; tarefas: Tarefa[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      const key = format(d, 'yyyy-MM-dd');
      const t = tarefasByDate.get(key) || [];
      if (t.length > 0 || i === 0) {
        days.push({ date: d, tarefas: t });
      }
    }
    return days;
  }, [selectedDate, tarefasByDate]);

  // Unscheduled tarefas
  const unscheduled = useMemo(() => {
    return tarefas?.filter(t => !t.data_agendada && t.status !== 'concluida' && t.status !== 'cancelada') || [];
  }, [tarefas]);

  const prioColor = (p: string) => {
    const cfg = PRIORIDADE_CONFIG[p as keyof typeof PRIORIDADE_CONFIG];
    return cfg?.color || '';
  };

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      {/* Left: Calendar */}
      <div className="space-y-4">
        <Card className="rounded-xl shadow-sm border-border/50">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={pt}
              className="pointer-events-auto"
              modifiers={{
                hasTarefas: (date) => datesWithTarefas.has(format(date, 'yyyy-MM-dd')),
              }}
              modifiersStyles={{
                hasTarefas: {
                  fontWeight: 700,
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                  textDecorationColor: 'hsl(199 100% 31%)',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Unscheduled */}
        {unscheduled.length > 0 && (
          <Card className="rounded-xl shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Sem data ({unscheduled.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pb-3">
              {unscheduled.slice(0, 5).map(t => (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <p className="text-xs text-foreground truncate">{t.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">{t.obra?.nome || 'Sem obra'}</p>
                </button>
              ))}
              {unscheduled.length > 5 && (
                <p className="text-[10px] text-muted-foreground px-2">+{unscheduled.length - 5} mais</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Day view / Upcoming */}
      <div className="space-y-4">
        {/* Selected day header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tarefasForDay.length} tarefa{tarefasForDay.length !== 1 ? 's' : ''} agendada{tarefasForDay.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d);
            }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d);
            }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day timeline */}
        {tarefasForDay.length > 0 ? (
          <div className="space-y-2">
            {tarefasForDay.map(tarefa => (
              <Card
                key={tarefa.id}
                className={cn(
                  "rounded-xl shadow-sm border-border/50 cursor-pointer hover:shadow-md transition-shadow",
                  tarefa.status === 'concluida' && 'opacity-60'
                )}
                onClick={() => onEdit(tarefa)}
              >
                <CardContent className="py-3 flex items-center gap-3">
                  {/* Time */}
                  <div className="w-14 text-center shrink-0">
                    {(tarefa as any).hora_agendada ? (
                      <p className="text-sm font-semibold text-primary">{(tarefa as any).hora_agendada}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-border shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        tarefa.status === 'concluida' && 'line-through text-muted-foreground'
                      )}>
                        {tarefa.titulo}
                      </p>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", prioColor(tarefa.prioridade))}>
                        {PRIORIDADE_CONFIG[tarefa.prioridade]?.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {tarefa.obra?.nome || 'Sem obra'}
                      {tarefa.categoria && ` • ${tarefa.categoria}`}
                    </p>
                  </div>

                  {/* Status action */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => { e.stopPropagation(); onToggleComplete(tarefa); }}
                  >
                    <CheckCircle2 className={cn(
                      "w-4 h-4",
                      tarefa.status === 'concluida' ? 'text-emerald-500' : 'text-muted-foreground'
                    )} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-xl shadow-sm border-border/50">
            <CardContent className="py-12 text-center">
              <CalendarIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma tarefa agendada para este dia</p>
            </CardContent>
          </Card>
        )}

        {/* Upcoming overview */}
        {upcomingDays.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Próximos dias</h4>
            {upcomingDays.slice(1).map(({ date, tarefas: dayTarefas }) => (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 text-center">
                    <p className="text-xs text-muted-foreground capitalize">{format(date, 'EEE', { locale: pt })}</p>
                    <p className="text-sm font-semibold text-foreground">{format(date, 'd')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{dayTarefas.length} tarefa{dayTarefas.length !== 1 ? 's' : ''}</p>
                    {dayTarefas[0] && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {(dayTarefas[0] as any).hora_agendada && `${(dayTarefas[0] as any).hora_agendada} - `}{dayTarefas[0].titulo}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
