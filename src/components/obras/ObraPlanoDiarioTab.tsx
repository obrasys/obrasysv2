import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Loader2, Trash2, Copy,
  Play, CheckCircle2, Ban, AlertTriangle, GripVertical, MapPin, User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDailyPlan } from '@/hooks/useDailyPlans';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/types/daily-plans';
import type { DailyPlanTaskStatus, DailyPlanTaskPriority } from '@/types/daily-plans';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  obraId: string;
}

export function ObraPlanoDiarioTab({ obraId }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { plan, tasks, taskStats, isLoading, addTask, updateTaskStatus, deleteTask, duplicateToDate } = useDailyPlan(obraId, dateStr);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', area_or_zone: '', priority: 'normal' as string, assigned_worker_id: '', notes: '' });

  // Fetch workers for assignment
  const { data: workers } = useQuery({
    queryKey: ['equipa-membros-obra', obraId],
    queryFn: async () => {
      const { data } = await supabase
        .from('alocacoes_obra')
        .select('membro_id, membro:equipa_membros(id, nome)')
        .eq('obra_id', obraId)
        .eq('ativo', true);
      return (data || []).map((a: any) => a.membro).filter(Boolean);
    },
  });

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    addTask.mutate({
      title: newTask.title,
      area_or_zone: newTask.area_or_zone || undefined,
      priority: newTask.priority,
      assigned_worker_id: newTask.assigned_worker_id || undefined,
      notes: newTask.notes || undefined,
    }, {
      onSuccess: () => {
        setNewTask({ title: '', area_or_zone: '', priority: 'normal', assigned_worker_id: '', notes: '' });
        setShowAddDialog(false);
      },
    });
  };

  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
      addTask.mutate({ title: (e.target as HTMLInputElement).value.trim() });
      (e.target as HTMLInputElement).value = '';
    }
  };

  const statusActions: { status: DailyPlanTaskStatus; icon: React.ReactNode; label: string }[] = [
    { status: 'in_progress', icon: <Play className="w-3.5 h-3.5" />, label: 'Iniciar' },
    { status: 'done', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Concluir' },
    { status: 'blocked', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Bloquear' },
    { status: 'cancelled', icon: <Ban className="w-3.5 h-3.5" />, label: 'Cancelar' },
  ];

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Plano Diário
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={isToday ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="min-w-[140px]"
          >
            {isToday ? 'Hoje' : format(selectedDate, "d 'de' MMMM", { locale: pt })}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {taskStats.total > 0 && (
          <div className="flex gap-3 text-sm">
            <span className="text-muted-foreground">{taskStats.total} tarefas</span>
            {taskStats.done > 0 && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{taskStats.done} concluídas</Badge>}
            {taskStats.inProgress > 0 && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{taskStats.inProgress} em progresso</Badge>}
            {taskStats.blocked > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{taskStats.blocked} bloqueadas</Badge>}
          </div>
        )}

        {/* Quick add */}
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar tarefa rápida... (Enter para criar)"
            onKeyDown={handleQuickAdd}
            className="flex-1"
          />
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Detalhada
          </Button>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => {
              const statusConf = TASK_STATUS_CONFIG[task.status];
              const priorityConf = TASK_PRIORITY_CONFIG[task.priority];
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                    task.status === 'done' ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'
                  }`}
                >
                  <GripVertical className="w-4 h-4 mt-1 text-muted-foreground/40 shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${task.status === 'done' ? 'line-through' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={`text-xs ${statusConf.color}`}>
                        {statusConf.icon} {statusConf.label}
                      </Badge>
                      {task.priority !== 'normal' && (
                        <Badge variant="outline" className={`text-xs ${priorityConf.color}`}>
                          {priorityConf.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.area_or_zone && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {task.area_or_zone}
                        </span>
                      )}
                      {task.assigned_worker && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assigned_worker.nome}
                        </span>
                      )}
                      {task.notes && <span className="truncate max-w-[200px]">{task.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {statusActions
                      .filter(a => a.status !== task.status)
                      .slice(0, 2)
                      .map(action => (
                        <Button
                          key={action.status}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={action.label}
                          onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: action.status })}
                        >
                          {action.icon}
                        </Button>
                      ))}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Duplicar para amanhã"
                      onClick={() => duplicateToDate.mutate({ taskId: task.id, targetDate: tomorrowStr })}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      title="Eliminar"
                      onClick={() => deleteTask.mutate(task.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Sem tarefas planeadas</p>
            <p className="text-sm mt-1">Adicione tarefas para organizar o dia desta obra.</p>
          </div>
        )}

        {/* Add Task Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Tarefa do Dia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tarefa *</Label>
                <Input
                  placeholder="Ex: Pintar parede da casa de banho"
                  value={newTask.title}
                  onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Área / Zona</Label>
                  <Input
                    placeholder="Ex: Cozinha, Piso 1"
                    value={newTask.area_or_zone}
                    onChange={e => setNewTask(p => ({ ...p, area_or_zone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {workers && workers.length > 0 && (
                <div>
                  <Label>Responsável</Label>
                  <Select value={newTask.assigned_worker_id || "none"} onValueChange={v => setNewTask(p => ({ ...p, assigned_worker_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {workers.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>{w.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Notas</Label>
                <Textarea
                  placeholder="Observações sobre esta tarefa..."
                  value={newTask.notes}
                  onChange={e => setNewTask(p => ({ ...p, notes: e.target.value }))}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
              <Button onClick={handleAddTask} disabled={!newTask.title.trim() || addTask.isPending}>
                {addTask.isPending ? 'A criar...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
