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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  useObraLaborSummary,
  useObraLaborEntries,
  useObraLaborChart,
  useObraLaborByWorker,
  useObraLaborByCostType,
  getOriginLabel,
} from '@/hooks/useObraLaborCosts';
import { WorkerCreateModal } from '@/components/livro-ponto/WorkerCreateModal';
import { useCreateWorker } from '@/hooks/useLivroPonto';
import { useSubempreiteiros, useEquipaMembros } from '@/hooks/useRecursos';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210 70% 55%)',
  'hsl(150 60% 45%)',
  'hsl(45 90% 55%)',
  'hsl(0 70% 55%)',
  'hsl(270 60% 55%)',
  'hsl(180 50% 45%)',
];

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

  const { data: summary, isLoading: loadingSummary } = useObraLaborSummary(obraId);
  const { data: entries, isLoading: loadingEntries } = useObraLaborEntries(obraId, {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: chartData } = useObraLaborChart(obraId);
  const { data: byWorker } = useObraLaborByWorker(obraId);
  const { data: byCostType } = useObraLaborByCostType(obraId);
  const createWorkerMutation = useCreateWorker();
  const { subempreiteiros } = useSubempreiteiros();
  const { membros: equipaMembros } = useEquipaMembros();

  const isLoading = loadingSummary || loadingEntries;

  const handleCreateWorker = async (data: any) => {
    await createWorkerMutation.mutateAsync(data);
    setWorkerModalOpen(false);
  };

  const costTypeChartData = useMemo(
    () => (byCostType || []).map(ct => ({ name: getOriginLabel(ct.origin_type), value: ct.total_cost })),
    [byCostType]
  );

  const workerChartData = useMemo(
    () => (byWorker || []).slice(0, 8).map(w => ({ name: w.worker_name, value: w.total_cost })),
    [byWorker]
  );

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
          <p>Nenhum custo de mão de obra registado.</p>
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
      <div className="space-y-4 md:space-y-6">
        {/* Action button */}
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setWorkerModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Trabalhador
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mão de obra hoje</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.todayCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.todayWorkers} trabalhadores · {summary.todayHours.toFixed(1)}h
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta semana</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.weekCost)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Este mês</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.monthCost)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acumulado total</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.totalHours.toFixed(0)}h · {summary.totalWorkers} trabalhadores
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/10">
                <CircleDollarSign className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!compact && (
        <>
          {/* Evolution Chart */}
          {chartData && chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução de Custo Diário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => format(parseISO(d), 'dd/MM', { locale: pt })}
                        className="text-xs fill-muted-foreground"
                      />
                      <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v: number) => `${v}€`} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        labelFormatter={(d: string) => format(parseISO(d), "d 'de' MMMM", { locale: pt })}
                      />
                      <Bar dataKey="cost" name="Custo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Distribution Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {workerChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custo por Trabalhador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={workerChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {workerChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {costTypeChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custo por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costTypeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tickFormatter={(v: number) => `${v}€`} className="text-xs fill-muted-foreground" />
                        <YAxis type="category" dataKey="name" width={100} className="text-xs fill-muted-foreground" />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="value" name="Custo" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filters */}
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

          {/* Entries Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lançamentos de Mão de Obra</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate(`/livro-ponto/lancar?obra=${obraId}`)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Livro de Ponto
              </Button>
            </CardHeader>
            <CardContent>
              {entries && entries.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Trabalhador</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                        <TableHead className="text-right">Custo/Hora</TableHead>
                        <TableHead className="text-right">Custo Total</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.slice(0, 50).map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell>{format(parseISO(entry.entry_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-medium">{entry.worker_name}</TableCell>
                          <TableCell className="text-muted-foreground">{entry.worker_role || '—'}</TableCell>
                          <TableCell className="text-right">{entry.hours_worked.toFixed(1)}h</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.hourly_cost)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(entry.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getOriginLabel(entry.origin_type)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {entries.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center mt-3">
                      A mostrar 50 de {entries.length} lançamentos
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Nenhum lançamento no período selecionado.</p>
              )}
            </CardContent>
          </Card>
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
