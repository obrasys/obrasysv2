import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertTriangle, Plus, Trash2, Clock, Ban, CheckCircle2, Loader2,
  AlertOctagon, GitBranch,
} from 'lucide-react';
import { useDailyReportConstraints } from '@/hooks/useDailyReports';
import {
  CONSTRAINT_TYPE_LABELS,
  type ConstraintType,
  type ConstraintSeverity,
  type ConstraintStatus,
} from '@/types/daily-reports';
import { useToast } from '@/hooks/use-toast';

interface Props {
  reportId: string;
  obraId: string;
}

const SEVERITY_LABELS: Record<ConstraintSeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  total: 'Total',
};

const SEVERITY_COLORS: Record<ConstraintSeverity, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  total: 'bg-destructive/10 text-destructive',
};

const STATUS_LABELS: Record<ConstraintStatus, string> = {
  open: 'Aberta',
  in_progress: 'Em resolução',
  resolved: 'Resolvida',
};

const STATUS_ICONS: Record<ConstraintStatus, typeof AlertTriangle> = {
  open: Ban,
  in_progress: Clock,
  resolved: CheckCircle2,
};

interface FormState {
  constraint_type: ConstraintType;
  objective_description: string;
  severity: ConstraintSeverity;
  status: ConstraintStatus;
  impact_hours: number;
  impact_days: number;
  impact_start_at: string;
  impact_end_at: string;
  resolution_due_date: string;
  blocks_successors: boolean;
  triggers_auto_replanning: boolean;
}

const INITIAL_FORM: FormState = {
  constraint_type: 'material',
  objective_description: '',
  severity: 'medium',
  status: 'open',
  impact_hours: 0,
  impact_days: 0,
  impact_start_at: '',
  impact_end_at: '',
  resolution_due_date: '',
  blocks_successors: false,
  triggers_auto_replanning: false,
};

export function RDOConstraintsEditor({ reportId, obraId }: Props) {
  const { constraints, isLoading, addConstraint, updateConstraint, removeConstraint } = useDailyReportConstraints(reportId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const { toast } = useToast();

  const handleAdd = () => {
    if (!form.objective_description.trim()) {
      toast({ title: 'Descrição obrigatória', variant: 'destructive' });
      return;
    }
    addConstraint.mutate(
      {
        daily_report_id: reportId,
        obra_id: obraId,
        constraint_type: form.constraint_type,
        objective_description: form.objective_description,
        severity: form.severity,
        status: form.status,
        impact_hours: form.impact_hours,
        impact_days: form.impact_days,
        impact_start_at: form.impact_start_at || null,
        impact_end_at: form.impact_end_at || null,
        resolution_due_date: form.resolution_due_date || null,
        blocks_successors: form.blocks_successors,
        triggers_auto_replanning: form.triggers_auto_replanning,
      },
      {
        onSuccess: () => {
          setForm({ ...INITIAL_FORM });
          setShowForm(false);
          toast({ title: 'Restrição registada' });
        },
      }
    );
  };

  const handleStatusChange = (id: string, status: ConstraintStatus) => {
    updateConstraint.mutate({ id, status });
  };

  const openCount = (constraints || []).filter(c => c.status === 'open').length;
  const highSeverityCount = (constraints || []).filter(c => c.severity === 'high' || c.severity === 'total').length;
  const totalImpactHours = (constraints || []).reduce((s, c) => s + (c.impact_hours || 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{openCount}</p>
            <p className="text-xs text-muted-foreground">Abertas</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-3 text-center">
            <AlertOctagon className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold">{highSeverityCount}</p>
            <p className="text-xs text-muted-foreground">Alta/Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{totalImpactHours}h</p>
            <p className="text-xs text-muted-foreground">Impacto total</p>
          </CardContent>
        </Card>
      </div>

      {/* Add button */}
      {!showForm && (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Adicionar Restrição
        </Button>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Nova Restrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.constraint_type} onValueChange={(v) => setForm(f => ({ ...f, constraint_type: v as ConstraintType }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CONSTRAINT_TYPE_LABELS) as [ConstraintType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Severidade</Label>
                <Select value={form.severity} onValueChange={(v) => setForm(f => ({ ...f, severity: v as ConstraintSeverity }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(SEVERITY_LABELS) as [ConstraintSeverity, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição do impedimento</Label>
              <Textarea
                value={form.objective_description}
                onChange={e => setForm(f => ({ ...f, objective_description: e.target.value }))}
                placeholder="Descreva objectivamente o impedimento ou restrição..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Horas de impacto</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.impact_hours}
                  onChange={e => setForm(f => ({ ...f, impact_hours: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Dias de impacto</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.impact_days}
                  onChange={e => setForm(f => ({ ...f, impact_days: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início do impacto</Label>
                <Input
                  type="datetime-local"
                  value={form.impact_start_at}
                  onChange={e => setForm(f => ({ ...f, impact_start_at: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Fim previsto</Label>
                <Input
                  type="datetime-local"
                  value={form.impact_end_at}
                  onChange={e => setForm(f => ({ ...f, impact_end_at: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Prazo de resolução</Label>
              <Input
                type="date"
                value={form.resolution_due_date}
                onChange={e => setForm(f => ({ ...f, resolution_due_date: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.blocks_successors}
                  onCheckedChange={v => setForm(f => ({ ...f, blocks_successors: v }))}
                />
                <Label className="text-xs">Bloqueia sucessoras</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.triggers_auto_replanning}
                  onCheckedChange={v => setForm(f => ({ ...f, triggers_auto_replanning: v }))}
                />
                <Label className="text-xs">Replaneamento auto.</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} disabled={addConstraint.isPending} className="text-xs">
                {addConstraint.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Registar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm({ ...INITIAL_FORM }); }} className="text-xs">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Constraints list */}
      {(constraints || []).length === 0 && !showForm && (
        <div className="text-center py-6 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma restrição registada neste RDO.</p>
        </div>
      )}

      {(constraints || []).map(c => {
        const StatusIcon = STATUS_ICONS[c.status as ConstraintStatus] || AlertTriangle;
        return (
          <Card key={c.id} className={c.status === 'resolved' ? 'opacity-60' : ''}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StatusIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {CONSTRAINT_TYPE_LABELS[c.constraint_type as ConstraintType] || c.constraint_type}
                  </span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${SEVERITY_COLORS[c.severity as ConstraintSeverity] || ''}`}>
                    {SEVERITY_LABELS[c.severity as ConstraintSeverity] || c.severity}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeConstraint.mutate(c.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">{c.objective_description}</p>

              <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
                {c.impact_hours > 0 && <span>⏱ {c.impact_hours}h impacto</span>}
                {c.impact_days > 0 && <span>📅 {c.impact_days}d impacto</span>}
                {c.blocks_successors && (
                  <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                    <GitBranch className="h-3 w-3" /> Bloqueia sucessoras
                  </span>
                )}
                {c.triggers_auto_replanning && (
                  <Badge variant="secondary" className="text-[10px] h-4">Replaneamento auto.</Badge>
                )}
              </div>

              {/* Status changer */}
              <div className="flex gap-1 pt-1">
                {(['open', 'in_progress', 'resolved'] as ConstraintStatus[]).map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={c.status === s ? 'default' : 'outline'}
                    className="text-[10px] h-6 px-2"
                    onClick={() => handleStatusChange(c.id, s)}
                    disabled={updateConstraint.isPending}
                  >
                    {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
