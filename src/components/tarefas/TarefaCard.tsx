import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  User,
  Link,
  AlertTriangle,
  HardHat,
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Tarefa } from '@/types/tarefas';
import { PRIORIDADE_CONFIG, STATUS_CONFIG } from '@/types/tarefas';
import { cn } from '@/lib/utils';

interface TarefaCardProps {
  tarefa: Tarefa;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (tarefa: Tarefa) => void;
  onToggleComplete: (tarefa: Tarefa) => void;
  showObra?: boolean;
}

export function TarefaCard({
  tarefa,
  onEdit,
  onDelete,
  onToggleComplete,
  showObra = false,
}: TarefaCardProps) {
  const prioridadeConfig = PRIORIDADE_CONFIG[tarefa.prioridade];
  const statusConfig = STATUS_CONFIG[tarefa.status];
  const isCompleted = tarefa.status === 'concluida';
  const isOverdue = tarefa.data_agendada && 
    isPast(parseISO(tarefa.data_agendada)) && 
    !isToday(parseISO(tarefa.data_agendada)) &&
    !isCompleted;
  const hasDependencies = tarefa.dependencias && tarefa.dependencias.length > 0;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      isCompleted && 'opacity-60',
      isOverdue && 'border-destructive/50'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggleComplete(tarefa)}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-medium text-sm',
                  isCompleted && 'line-through text-muted-foreground'
                )}>
                  {tarefa.titulo}
                </h3>
                
                {tarefa.descricao && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {tarefa.descricao}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => onEdit(tarefa)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(tarefa)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="secondary" className={cn('text-xs', prioridadeConfig.color)}>
                {prioridadeConfig.icon} {prioridadeConfig.label}
              </Badge>
              
              <Badge variant="secondary" className={cn('text-xs', statusConfig.color)}>
                {statusConfig.label}
              </Badge>

              {tarefa.categoria && (
                <Badge variant="outline" className="text-xs">
                  {tarefa.categoria}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              {showObra && tarefa.obra && (
                <div className="flex items-center gap-1">
                  <HardHat className="h-3 w-3" />
                  <span>{tarefa.obra.nome}</span>
                </div>
              )}

              {tarefa.data_agendada && (
                <div className={cn(
                  'flex items-center gap-1',
                  isOverdue && 'text-destructive font-medium'
                )}>
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  <Calendar className="h-3 w-3" />
                  <span>
                    {isToday(parseISO(tarefa.data_agendada)) 
                      ? 'Hoje'
                      : format(parseISO(tarefa.data_agendada), "d MMM", { locale: pt })}
                  </span>
                </div>
              )}

              {tarefa.responsavel && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{tarefa.responsavel.nome}</span>
                </div>
              )}

              {hasDependencies && (
                <div className="flex items-center gap-1">
                  <Link className="h-3 w-3" />
                  <span>{tarefa.dependencias.length} dependência(s)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
