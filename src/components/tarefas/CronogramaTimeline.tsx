import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Flag, Milestone, Layers, Package } from 'lucide-react';
import { format, parseISO, differenceInDays, isWithinInterval, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { TarefaCronograma } from '@/types/tarefas';
import { CRONOGRAMA_STATUS_CONFIG, CRONOGRAMA_TIPO_CONFIG } from '@/types/tarefas';
import { cn } from '@/lib/utils';

interface CronogramaTimelineProps {
  items: TarefaCronograma[];
  onEdit: (item: TarefaCronograma) => void;
  onDelete: (item: TarefaCronograma) => void;
}

const TIPO_ICONS = {
  tarefa: Layers,
  marco: Milestone,
  fase: Flag,
  entrega: Package,
};

export function CronogramaTimeline({ items, onEdit, onDelete }: CronogramaTimelineProps) {
  // Calculate timeline range
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (!items.length) {
      const today = new Date();
      return {
        startDate: today,
        endDate: addDays(today, 30),
        totalDays: 30,
      };
    }

    const dates = items.flatMap(item => [
      parseISO(item.data_inicio),
      item.data_fim ? parseISO(item.data_fim) : parseISO(item.data_inicio),
    ]);
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 7);
    
    return {
      startDate: start,
      endDate: end,
      totalDays: differenceInDays(end, start) || 1,
    };
  }, [items]);

  // Check if today is within the timeline
  const today = new Date();
  const todayPosition = useMemo(() => {
    if (isWithinInterval(today, { start: startDate, end: endDate })) {
      return (differenceInDays(today, startDate) / totalDays) * 100;
    }
    return null;
  }, [startDate, endDate, totalDays]);

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; position: number }[] = [];
    let current = new Date(startDate);
    current.setDate(1);
    
    while (current <= endDate) {
      const position = (differenceInDays(current, startDate) / totalDays) * 100;
      if (position >= 0 && position <= 100) {
        labels.push({
          month: format(current, 'MMM yyyy', { locale: pt }),
          position,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }
    
    return labels;
  }, [startDate, endDate, totalDays]);

  const getItemPosition = (item: TarefaCronograma) => {
    const start = parseISO(item.data_inicio);
    const end = item.data_fim ? parseISO(item.data_fim) : start;
    
    const leftPercent = (differenceInDays(start, startDate) / totalDays) * 100;
    const widthPercent = ((differenceInDays(end, start) + 1) / totalDays) * 100;
    
    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.max(2, widthPercent)}%`,
    };
  };

  if (!items.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Cronograma vazio</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Adicione itens ao cronograma para visualizar a linha do tempo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Linha do Tempo</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Month labels */}
        <div className="relative h-6 mb-2 border-b">
          {monthLabels.map((label, i) => (
            <div
              key={i}
              className="absolute text-xs text-muted-foreground font-medium"
              style={{ left: `${label.position}%` }}
            >
              {label.month}
            </div>
          ))}
        </div>

        {/* Timeline container */}
        <div className="relative">
          {/* Today marker */}
          {todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
              style={{ left: `${todayPosition}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary bg-background px-1">
                Hoje
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-2 py-2">
            {items.map((item) => {
              const position = getItemPosition(item);
              const statusConfig = CRONOGRAMA_STATUS_CONFIG[item.status];
              const tipoConfig = CRONOGRAMA_TIPO_CONFIG[item.tipo];
              const TipoIcon = TIPO_ICONS[item.tipo];

              return (
                <div key={item.id} className="relative h-14 group">
                  <div
                    className={cn(
                      'absolute h-full rounded-md border shadow-sm',
                      'flex items-center px-2 gap-2 overflow-hidden',
                      'transition-all hover:shadow-md hover:z-20',
                      item.status === 'concluido' && 'opacity-60'
                    )}
                    style={{
                      left: position.left,
                      width: position.width,
                      backgroundColor: item.cor + '20',
                      borderColor: item.cor,
                    }}
                  >
                    <TipoIcon 
                      className="h-4 w-4 shrink-0" 
                      style={{ color: item.cor }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {item.titulo}
                      </div>
                      {item.progresso > 0 && (
                        <Progress 
                          value={item.progresso} 
                          className="h-1 mt-1"
                        />
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
