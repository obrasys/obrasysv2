import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDailyReportProductions, useDailyReportActivities } from '@/hooks/useDailyReports';
import { useScheduleTasks } from '@/hooks/useSchedule';
import {
  Plus, Trash2, Hammer, MapPin, GitBranch, CheckCircle2, XCircle, BarChart3,
} from 'lucide-react';

interface Props {
  reportId: string;
  obraId: string;
  scheduleVersionId?: string;
  readOnly?: boolean;
}

const UNITS = ['m²', 'm³', 'ml', 'un', 'kg', 'vg', 'l', 'm', 'ton', 'h'];

interface NewProductionForm {
  service_name: string;
  subservice_name: string;
  exact_location: string;
  quantity_planned_today: number;
  quantity_executed_today: number;
  unit: string;
  accumulated_production: number;
  rejected_production: number;
  approved_production: number;
  related_schedule_task_id: string;
  daily_report_activity_id: string;
  technical_notes: string;
}

const emptyForm: NewProductionForm = {
  service_name: '',
  subservice_name: '',
  exact_location: '',
  quantity_planned_today: 0,
  quantity_executed_today: 0,
  unit: 'm²',
  accumulated_production: 0,
  rejected_production: 0,
  approved_production: 0,
  related_schedule_task_id: '',
  daily_report_activity_id: '',
  technical_notes: '',
};

export function RDOProductionEditor({ reportId, obraId, scheduleVersionId, readOnly }: Props) {
  const { productions, isLoading, addProduction, removeProduction, updateProduction } = useDailyReportProductions(reportId);
  const { activities } = useDailyReportActivities(reportId);
  const { tasks } = useScheduleTasks(scheduleVersionId, obraId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProductionForm>({ ...emptyForm });

  const scheduleTasks = (tasks || []).filter(t => t.task_type === 'task');

  const handleAdd = () => {
    const execPercent = form.quantity_planned_today > 0
      ? Math.round((form.quantity_executed_today / form.quantity_planned_today) * 100)
      : 0;

    addProduction.mutate({
      daily_report_id: reportId,
      obra_id: obraId,
      service_name: form.service_name,
      subservice_name: form.subservice_name || undefined,
      exact_location: form.exact_location || undefined,
      quantity_planned_today: form.quantity_planned_today,
      quantity_executed_today: form.quantity_executed_today,
      unit: form.unit,
      accumulated_production: form.accumulated_production,
      rejected_production: form.rejected_production,
      approved_production: form.approved_production || form.quantity_executed_today - form.rejected_production,
      executed_percent_task: execPercent,
      related_schedule_task_id: form.related_schedule_task_id || undefined,
      daily_report_activity_id: form.daily_report_activity_id || undefined,
      technical_notes: form.technical_notes || undefined,
    });
    setForm({ ...emptyForm });
    setShowForm(false);
  };

  const handleTaskSelect = (taskId: string) => {
    const task = scheduleTasks.find(t => t.id === taskId);
    setForm(prev => ({
      ...prev,
      related_schedule_task_id: taskId,
      service_name: prev.service_name || task?.name || '',
    }));
  };

  const handleActivitySelect = (activityId: string) => {
    const activity = activities?.find(a => a.id === activityId);
    setForm(prev => ({
      ...prev,
      daily_report_activity_id: activityId,
      related_schedule_task_id: prev.related_schedule_task_id || activity?.schedule_task_id || '',
    }));
  };

  const totalPlanned = (productions || []).reduce((s, p) => s + (p.quantity_planned_today || 0), 0);
  const totalExecuted = (productions || []).reduce((s, p) => s + (p.quantity_executed_today || 0), 0);
  const totalRejected = (productions || []).reduce((s, p) => s + (p.rejected_production || 0), 0);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">A carregar produções...</div>;
  }

  return (
    <div className="space-y-4">
      {productions && productions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-muted/30">
            <CardContent className="py-3 text-center">
              <p className="text-lg font-bold">{totalPlanned.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Previsto hoje</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="py-3 text-center">
              <p className={`text-lg font-bold ${totalExecuted >= totalPlanned ? 'text-green-600' : 'text-amber-600'}`}>
                {totalExecuted.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">Executado hoje</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="py-3 text-center">
              <p className={`text-lg font-bold ${totalRejected > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalRejected.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">Rejeitado</p>
            </CardContent>
          </Card>
        </div>
      )}

      {productions && productions.length > 0 && (
        <div className="space-y-2">
          {productions.map(prod => {
            const execRate = prod.quantity_planned_today && prod.quantity_planned_today > 0
              ? Math.round(((prod.quantity_executed_today || 0) / prod.quantity_planned_today) * 100)
              : 0;

            return (
              <Card key={prod.id} className="border">
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Hammer className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{prod.service_name}</span>
                        {prod.subservice_name && (
                          <span className="text-xs text-muted-foreground">/ {prod.subservice_name}</span>
                        )}
                      </div>
                      {prod.exact_location && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {prod.exact_location}
                        </div>
                      )}
                      {(prod as any).schedule_task && (
                        <div className="flex items-center gap-1 mt-1">
                          <GitBranch className="h-3 w-3 text-primary" />
                          <span className="text-[10px] text-primary">{(prod as any).schedule_task.wbs_code} - {(prod as any).schedule_task.name}</span>
                        </div>
                      )}
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeProduction.mutate(prod.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs text-center">
                    <div>
                      <p className="font-semibold">{prod.quantity_planned_today || 0} {prod.unit}</p>
                      <p className="text-muted-foreground">Previsto</p>
                    </div>
                    <div>
                      <p className={`font-semibold ${execRate >= 100 ? 'text-green-600' : execRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                        {prod.quantity_executed_today || 0} {prod.unit}
                      </p>
                      <p className="text-muted-foreground">Executado</p>
                    </div>
                    <div>
                      <p className="font-semibold">{prod.accumulated_production || 0} {prod.unit}</p>
                      <p className="text-muted-foreground">Acumulado</p>
                    </div>
                    <div>
                      <Badge variant={execRate >= 100 ? 'default' : execRate >= 80 ? 'secondary' : 'destructive'} className="text-[9px]">
                        {execRate}%
                      </Badge>
                      <p className="text-muted-foreground mt-0.5">Rendimento</p>
                    </div>
                  </div>

                  {(prod.rejected_production || 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <XCircle className="h-3 w-3" />
                      {prod.rejected_production} {prod.unit} rejeitadas
                    </div>
                  )}

                  {prod.technical_notes && (
                    <p className="text-[10px] text-muted-foreground italic">{prod.technical_notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!readOnly && !showForm && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar produção
        </Button>
      )}

      {showForm && !readOnly && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Nova produção física
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduleTasks.length > 0 && (
              <div>
                <Label className="text-xs">Tarefa do cronograma (opcional)</Label>
                <Select value={form.related_schedule_task_id} onValueChange={handleTaskSelect}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Vincular a tarefa..." /></SelectTrigger>
                  <SelectContent>
                    {scheduleTasks.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.wbs_code ? `${t.wbs_code} - ` : ''}{t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activities && activities.length > 0 && (
              <div>
                <Label className="text-xs">Atividade RDO (opcional)</Label>
                <Select value={form.daily_report_activity_id} onValueChange={handleActivitySelect}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Vincular a atividade..." /></SelectTrigger>
                  <SelectContent>
                    {activities.map(a => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.work_area || 'Atividade'} - {a.wbs_code || a.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Serviço *</Label>
                <Input
                  value={form.service_name}
                  onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))}
                  placeholder="Ex: Betonagem de laje, Alvenaria..."
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Sub-serviço</Label>
                <Input
                  value={form.subservice_name}
                  onChange={e => setForm(p => ({ ...p, subservice_name: e.target.value }))}
                  placeholder="Ex: Armação, Cofragem..."
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Localização exata</Label>
                <Input
                  value={form.exact_location}
                  onChange={e => setForm(p => ({ ...p, exact_location: e.target.value }))}
                  placeholder="Ex: Bloco A, Piso 2, Zona Norte"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Unidade</Label>
                <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Qtd prevista hoje</Label>
                <Input type="number" step="0.1" value={form.quantity_planned_today || ''} onChange={e => setForm(p => ({ ...p, quantity_planned_today: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Qtd executada hoje</Label>
                <Input type="number" step="0.1" value={form.quantity_executed_today || ''} onChange={e => setForm(p => ({ ...p, quantity_executed_today: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Acumulado</Label>
                <Input type="number" step="0.1" value={form.accumulated_production || ''} onChange={e => setForm(p => ({ ...p, accumulated_production: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Rejeitada</Label>
                <Input type="number" step="0.1" value={form.rejected_production || ''} onChange={e => setForm(p => ({ ...p, rejected_production: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Aprovada</Label>
                <Input type="number" step="0.1" value={form.approved_production || ''} onChange={e => setForm(p => ({ ...p, approved_production: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Notas técnicas</Label>
              <Textarea
                value={form.technical_notes}
                onChange={e => setForm(p => ({ ...p, technical_notes: e.target.value }))}
                placeholder="Observações sobre a produção..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setForm({ ...emptyForm }); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!form.service_name || addProduction.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {addProduction.isPending ? 'A guardar...' : 'Registar produção'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(!productions || productions.length === 0) && !showForm && (
        <div className="text-center py-4 text-muted-foreground text-xs">
          Sem produções registadas. Adicione a produção física do dia.
        </div>
      )}
    </div>
  );
}
