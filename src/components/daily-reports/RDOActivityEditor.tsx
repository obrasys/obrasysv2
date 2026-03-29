import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useDailyReportActivities } from '@/hooks/useDailyReports';
import { useScheduleTasks } from '@/hooks/useSchedule';
import type { ScheduleTask } from '@/types/schedule';
import type { DailyReportActivity, ActivityTaskStatus } from '@/types/daily-reports';
import {
  Plus, Trash2, GitBranch, TrendingUp, TrendingDown, Target,
  CheckCircle2, Clock, AlertTriangle, Sparkles, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  reportId: string;
  obraId: string;
  scheduleVersionId?: string;
  readOnly?: boolean;
}

const TASK_STATUS_OPTIONS: { value: ActivityTaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Não iniciada' },
  { value: 'started', label: 'Iniciada' },
  { value: 'in_progress', label: 'Em curso' },
  { value: 'suspended', label: 'Suspensa' },
  { value: 'completed', label: 'Concluída' },
];

interface ActivityDraft {
  schedule_task_id: string;
  task_name: string;
  wbs_code: string | null;
  total_planned_quantity: number;
  unit: string | null;
  actual_percent_before_rdo: number;
  actual_percent_after_rdo: number;
  quantity_planned_today: number;
  quantity_done_today: number;
  quantity_done_accumulated: number;
  remaining_quantity: number;
  estimated_remaining_duration_days: number | null;
  task_status: ActivityTaskStatus;
  notes: string;
}

export function RDOActivityEditor({ reportId, obraId, scheduleVersionId, readOnly }: Props) {
  const { activities, isLoading, addActivity, removeActivity, updateActivity } = useDailyReportActivities(reportId);
  const { tasks } = useScheduleTasks(scheduleVersionId, obraId);
  const { toast } = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [axiaInsights, setAxiaInsights] = useState<string | null>(null);

  // Tasks already linked in this RDO
  const linkedTaskIds = new Set(activities?.map(a => a.schedule_task_id).filter(Boolean));

  // Available tasks (not yet linked)
  const availableTasks = (tasks || []).filter(
    t => t.task_type === 'task' && !linkedTaskIds.has(t.id)
  );

  const handleAddTask = (task: ScheduleTask) => {
    addActivity.mutate({
      daily_report_id: reportId,
      obra_id: obraId,
      schedule_task_id: task.id,
      wbs_code: task.wbs_code,
      total_planned_quantity: task.total_planned_quantity,
      unit: task.unit,
      actual_percent_before_rdo: task.actual_progress_percent,
      actual_percent_after_rdo: task.actual_progress_percent,
      quantity_planned_today: 0,
      quantity_done_today: 0,
      quantity_done_accumulated: 0,
      remaining_quantity: task.total_planned_quantity,
      planned_percent_to_date: task.planned_progress_percent,
      daily_deviation: 0,
      accumulated_deviation: 0,
      plan_adherence_percent: 100,
      impact_schedule_days: 0,
      task_status: task.status_flag as ActivityTaskStatus || 'in_progress',
      criticality: task.criticality || 'non_critical',
      requires_replanning: false,
    });
    setShowPicker(false);
  };

  const handleUpdatePercent = (activityId: string, newPercent: number) => {
    const activity = activities?.find(a => a.id === activityId);
    if (!activity) return;
    
    const deviation = newPercent - activity.planned_percent_to_date;
    
    updateActivity.mutate({
      id: activityId,
      data: {
        actual_percent_after_rdo: Math.min(100, Math.max(0, newPercent)),
        daily_deviation: Number(deviation.toFixed(1)),
        accumulated_deviation: Number(deviation.toFixed(1)),
        task_status: newPercent >= 100 ? 'completed' : newPercent > 0 ? 'in_progress' : 'not_started',
      },
    });
  };

  const handleUpdateQuantity = (activityId: string, qtyDone: number) => {
    const activity = activities?.find(a => a.id === activityId);
    if (!activity) return;
    
    const totalQty = activity.total_planned_quantity || 1;
    const accumulated = (activity.quantity_done_accumulated || 0) + qtyDone;
    const newPercent = Math.min(100, (accumulated / totalQty) * 100);
    
    updateActivity.mutate({
      id: activityId,
      data: {
        quantity_done_today: qtyDone,
        quantity_done_accumulated: accumulated,
        remaining_quantity: Math.max(0, totalQty - accumulated),
        actual_percent_after_rdo: Number(newPercent.toFixed(1)),
        task_status: newPercent >= 100 ? 'completed' : 'in_progress',
      },
    });
  };

  const analyzeWithAxia = async () => {
    if (!activities?.length) return;
    setIsAnalyzing(true);
    setAxiaInsights(null);
    try {
      const { data, error } = await supabase.functions.invoke('axia-chat', {
        body: {
          question: `Analisa o progresso das atividades registadas nesta RDO e dá-me um resumo com alertas e sugestões. Atividades: ${JSON.stringify(
            activities.map(a => ({
              tarefa: a.schedule_task?.name || a.wbs_code || 'Sem nome',
              previsto: a.planned_percent_to_date,
              real_antes: a.actual_percent_before_rdo,
              real_depois: a.actual_percent_after_rdo,
              desvio: a.daily_deviation,
              estado: a.task_status,
              criticidade: a.criticality,
            }))
          )}. Responde em português de forma concisa com emojis para facilitar a leitura.`,
        },
      });
      if (error) throw error;
      setAxiaInsights(data?.response || data?.message || 'Sem análise disponível.');
    } catch (err) {
      console.error('Axia analysis error:', err);
      toast({ title: 'Erro na análise Axia', description: 'Não foi possível gerar a análise.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">A carregar atividades...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Axia Insights */}
      {activities && activities.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={analyzeWithAxia}
            disabled={isAnalyzing}
            className="gap-1.5"
          >
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-[#00679d]" />}
            Analisar com Axia™
          </Button>
          {!scheduleVersionId && (
            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
              Sem cronograma — crie um planeamento primeiro
            </Badge>
          )}
        </div>
      )}

      {axiaInsights && (
        <Card className="border-[#00679d]/20 bg-[#00679d]/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-[#00679d] mt-0.5 shrink-0" />
              <div className="text-sm whitespace-pre-wrap">{axiaInsights}</div>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setAxiaInsights(null)}>
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Linked Activities */}
      {activities && activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map(activity => {
            const deviation = activity.actual_percent_after_rdo - activity.planned_percent_to_date;
            const isAhead = deviation >= 0;
            
            return (
              <Card key={activity.id} className="border-l-4" style={{
                borderLeftColor: activity.task_status === 'completed' ? 'hsl(var(--primary))' :
                  activity.task_status === 'suspended' ? 'hsl(0 84% 60%)' :
                  deviation < -5 ? 'hsl(0 84% 60%)' :
                  deviation < 0 ? 'hsl(45 93% 47%)' : 'hsl(142 76% 36%)',
              }}>
                <CardContent className="pt-4 pb-3 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {activity.schedule_task?.name || activity.wbs_code || 'Atividade'}
                        </span>
                        {activity.wbs_code && (
                          <Badge variant="outline" className="text-[10px]">{activity.wbs_code}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Previsto: {activity.planned_percent_to_date.toFixed(0)}%</span>
                        <span className={isAhead ? 'text-green-600' : 'text-red-600'}>
                          {isAhead ? <TrendingUp className="h-3 w-3 inline mr-0.5" /> : <TrendingDown className="h-3 w-3 inline mr-0.5" />}
                          Desvio: {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                        </span>
                        {activity.criticality === 'critical' && (
                          <Badge variant="destructive" className="text-[9px] py-0">Crítica</Badge>
                        )}
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeActivity.mutate(activity.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>Antes: {activity.actual_percent_before_rdo.toFixed(0)}%</span>
                      <span className="font-medium">Depois: {activity.actual_percent_after_rdo.toFixed(0)}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={activity.actual_percent_after_rdo} className="h-2" />
                      <div
                        className="absolute top-0 h-2 bg-muted-foreground/30 rounded-full"
                        style={{ width: `${activity.planned_percent_to_date}%` }}
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  {!readOnly && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-[10px]">% Progresso real</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={activity.actual_percent_after_rdo}
                          onChange={e => handleUpdatePercent(activity.id, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Qtd. feita hoje ({activity.unit || 'un'})</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          defaultValue={activity.quantity_done_today}
                          onBlur={e => handleUpdateQuantity(activity.id, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Duração restante (dias)</Label>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={activity.estimated_remaining_duration_days || ''}
                          onBlur={e => updateActivity.mutate({
                            id: activity.id,
                            data: { estimated_remaining_duration_days: parseInt(e.target.value) || null },
                          })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Estado</Label>
                        <Select
                          value={activity.task_status}
                          onValueChange={(v: ActivityTaskStatus) => updateActivity.mutate({
                            id: activity.id,
                            data: { task_status: v },
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_STATUS_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma atividade vinculada ao cronograma.</p>
            <p className="text-xs mt-1">Adicione tarefas do planeamento para registar avanço físico.</p>
          </CardContent>
        </Card>
      )}

      {/* Task Picker */}
      {!readOnly && (
        <>
          {!showPicker ? (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowPicker(true)}
              disabled={!scheduleVersionId || availableTasks.length === 0}
            >
              <Plus className="h-4 w-4" />
              Adicionar tarefa do cronograma
              {availableTasks.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{availableTasks.length} disponíveis</Badge>
              )}
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Selecionar tarefa do cronograma</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setShowPicker(false)}>Cancelar</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {availableTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todas as tarefas já foram adicionadas ou não há cronograma ativo.
                  </p>
                ) : (
                  availableTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddTask(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{task.name}</span>
                          {task.wbs_code && (
                            <Badge variant="outline" className="text-[9px] shrink-0">{task.wbs_code}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span>{task.actual_progress_percent.toFixed(0)}% completo</span>
                          {task.criticality === 'critical' && <span className="text-red-600">• Crítica</span>}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
