import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Users,
  Clock,
  CircleDollarSign,
  TrendingUp,
  ExternalLink,
  Loader2,
  Calendar,
  UserPlus,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  HardHat,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useObraLaborSummary,
  useObraLaborEntries,
  useObraLaborChart,
  useObraLaborByWorker,
  useObraLaborByCostType,
  useUpdateLaborEntry,
  getOriginLabel,
} from '@/hooks/useObraLaborCosts';
import { WorkerCreateModal } from '@/components/livro-ponto/WorkerCreateModal';
import { useCreateWorker } from '@/hooks/useLivroPonto';
import { useSubempreiteiros, useEquipaMembros } from '@/hooks/useRecursos';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

interface ObraLaborCostsTabProps {
  obraId: string;
  compact?: boolean;
}

export function ObraLaborCostsTab({ obraId, compact = false }: ObraLaborCostsTabProps) {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editRate, setEditRate] = useState('');
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  const { data: summary, isLoading: loadingSummary } = useObraLaborSummary(obraId);
  const { data: entries, isLoading: loadingEntries } = useObraLaborEntries(obraId, {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: chartData } = useObraLaborChart(obraId);
  const { data: byWorker } = useObraLaborByWorker(obraId);
  const { data: byCostType } = useObraLaborByCostType(obraId);
  const updateEntry = useUpdateLaborEntry();
  const createWorkerMutation = useCreateWorker();
  const { subempreiteiros } = useSubempreiteiros();
  const { membros: equipaMembros } = useEquipaMembros();

  const isLoading = loadingSummary || loadingEntries;

  const handleCreateWorker = async (data: any) => {
    await createWorkerMutation.mutateAsync(data);
    setWorkerModalOpen(false);
  };

  const startEdit = (entry: { id: string; hours_worked: number; hourly_cost: number }) => {
    setEditingId(entry.id);
    setEditHours(entry.hours_worked.toString());
    setEditRate(entry.hourly_cost.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditHours('');
    setEditRate('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const hours = parseFloat(editHours);
    const rate = parseFloat(editRate);
    if (isNaN(hours) || isNaN(rate) || hours < 0 || rate < 0) return;
    updateEntry.mutate({ id: editingId, hours_worked: hours, hourly_cost: rate }, {
      onSuccess: () => cancelEdit(),
    });
  };

  // Group entries by worker for the worker-centric view
  const entriesByWorker = useMemo(() => {
    if (!entries) return {};
    return entries.reduce((acc, entry) => {
      if (!acc[entry.worker_id]) {
        acc[entry.worker_id] = {
          name: entry.worker_name,
          role: entry.worker_role,
          entries: [],
          totalHours: 0,
          totalCost: 0,
        };
      }
      acc[entry.worker_id].entries.push(entry);
      acc[entry.worker_id].totalHours += entry.hours_worked;
      acc[entry.worker_id].totalCost += entry.amount;
      return acc;
    }, {} as Record<string, { name: string; role: string | null; entries: typeof entries; totalHours: number; totalCost: number }>);
  }, [entries]);

  const maxWorkerCost = useMemo(() => {
    const values = Object.values(entriesByWorker);
    return values.length > 0 ? Math.max(...values.map(w => w.totalCost)) : 1;
  }, [entriesByWorker]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary || summary.totalCost === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhum custo de mão de obra registado</p>
          <p className="text-sm mt-1">Os custos aparecerão automaticamente ao lançar horas no Livro de Ponto.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => navigate(`/livro-ponto/lancar?obra=${obraId}`)}>
              <Clock className="w-4 h-4 mr-2" />
              Ir para Livro de Ponto
            </Button>
            <Button onClick={() => setWorkerModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Trabalhador
            </Button>
          </div>
          <WorkerCreateModal
            open={workerModalOpen}
            onOpenChange={setWorkerModalOpen}
            subempreiteiros={subempreiteiros}
            equipaMembros={equipaMembros}
            onSave={handleCreateWorker}
            isLoading={createWorkerMutation.isPending}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => navigate(`/livro-ponto/lancar?obra=${obraId}`)}>
          <Clock className="w-4 h-4 mr-2" />
          Lançar Horas
        </Button>
        <Button size="sm" onClick={() => setWorkerModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Trabalhador
        </Button>
      </div>

      {/* KPI Summary — Redesigned */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <HardHat className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Hoje</p>
                <p className="text-xl font-bold leading-tight">{formatCurrency(summary.todayCost)}</p>
                <p className="text-[11px] text-muted-foreground">{summary.todayWorkers} trab. · {summary.todayHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Semana</p>
                <p className="text-xl font-bold leading-tight">{formatCurrency(summary.weekCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Mês</p>
                <p className="text-xl font-bold leading-tight">{formatCurrency(summary.monthCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total acumulado</p>
                <p className="text-xl font-bold leading-tight">{formatCurrency(summary.totalCost)}</p>
                <p className="text-[11px] text-muted-foreground">{summary.totalHours.toFixed(0)}h · {summary.totalWorkers} trab.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!compact && (
        <>
          {/* Worker-centric view */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Custos por Trabalhador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(entriesByWorker).map(([workerId, worker]) => {
                const isExpanded = expandedWorker === workerId;
                const costPercent = maxWorkerCost > 0 ? (worker.totalCost / maxWorkerCost) * 100 : 0;

                return (
                  <div key={workerId} className="border rounded-xl overflow-hidden transition-all">
                    {/* Worker header row */}
                    <button
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setExpandedWorker(isExpanded ? null : workerId)}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{worker.name}</span>
                          {worker.role && (
                            <Badge variant="secondary" className="text-[10px] h-4 shrink-0">{worker.role}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Progress value={costPercent} className="h-1.5 flex-1" />
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-bold">{formatCurrency(worker.totalCost)}</p>
                        <p className="text-[11px] text-muted-foreground">{worker.totalHours.toFixed(1)}h · {worker.entries.length} lanç.</p>
                      </div>
                      <div className="shrink-0 ml-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded entries */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 px-3 py-2 space-y-1.5">
                        {worker.entries.map(entry => (
                          <div key={entry.id} className="flex items-center gap-3 py-1.5 text-sm">
                            <span className="text-muted-foreground text-xs w-[72px] shrink-0">
                              {format(parseISO(entry.entry_date), 'dd/MM/yyyy')}
                            </span>

                            {editingId === entry.id ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={editHours}
                                    onChange={e => setEditHours(e.target.value)}
                                    className="w-16 h-7 text-xs text-right"
                                  />
                                  <span className="text-xs text-muted-foreground">h</span>
                                </div>
                                <span className="text-muted-foreground">×</span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editRate}
                                    onChange={e => setEditRate(e.target.value)}
                                    className="w-20 h-7 text-xs text-right"
                                  />
                                  <span className="text-xs text-muted-foreground">€/h</span>
                                </div>
                                <span className="text-xs font-semibold ml-auto">
                                  = {formatCurrency((parseFloat(editHours) || 0) * (parseFloat(editRate) || 0))}
                                </span>
                                <div className="flex gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEdit} disabled={updateEntry.isPending}>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                                    <X className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-muted-foreground">{entry.hours_worked.toFixed(1)}h</span>
                                <span className="text-muted-foreground">×</span>
                                <span className="text-muted-foreground">{formatCurrency(entry.hourly_cost)}/h</span>
                                <Badge variant="outline" className="text-[10px] h-4">{getOriginLabel(entry.origin_type)}</Badge>
                                <span className="font-semibold ml-auto">{formatCurrency(entry.amount)}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => startEdit(entry)}>
                                  <Pencil className="w-3 h-3 text-muted-foreground" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(entriesByWorker).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Sem lançamentos no período selecionado</p>
              )}
            </CardContent>
          </Card>

          {/* Evolution Chart */}
          {chartData && chartData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução de Custo Diário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => format(parseISO(d), 'dd/MM', { locale: pt })}
                        className="text-xs fill-muted-foreground"
                      />
                      <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v: number) => `${v}€`} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        labelFormatter={(d: string) => format(parseISO(d), "d 'de' MMMM", { locale: pt })}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="cost" name="Custo" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">De:</span>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Até:</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </>
      )}

      <WorkerCreateModal
        open={workerModalOpen}
        onOpenChange={setWorkerModalOpen}
        subempreiteiros={subempreiteiros}
        equipaMembros={equipaMembros}
        onSave={handleCreateWorker}
        isLoading={createWorkerMutation.isPending}
      />
    </div>
  );
}
