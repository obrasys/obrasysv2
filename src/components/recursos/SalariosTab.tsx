import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, HardHat, Clock, Euro, TrendingUp, UserCheck } from 'lucide-react';
import { useWorkers, useTimesheets, useTimesheetAllocations } from '@/hooks/useLivroPonto';
import { useEquipaMembros, useSubempreiteiros } from '@/hooks/useRecursos';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Worker } from '@/types/livro-ponto';
import type { EquipaMembro, Subempreiteiro } from '@/types/recursos';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

type WorkerCategory = 'all' | 'equipa' | 'subempreiteiro' | 'temporario';

interface EnrichedWorker {
  worker: Worker;
  category: WorkerCategory;
  categoryLabel: string;
  linkedName: string | null;
  totalHours: number;
  totalCost: number;
  monthlySalary: number;
  daysWorked: number;
}

export function SalariosTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WorkerCategory>('all');
  const [monthOffset, setMonthOffset] = useState(0);

  const referenceDate = useMemo(() => subMonths(new Date(), monthOffset), [monthOffset]);
  const monthStart = format(startOfMonth(referenceDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(referenceDate), 'yyyy-MM-dd');
  const monthLabel = format(referenceDate, 'MMMM yyyy', { locale: pt });

  const { data: workers = [], isLoading: loadingWorkers } = useWorkers();
  const { membros } = useEquipaMembros();
  const { subempreiteiros } = useSubempreiteiros();
  const { data: timesheets = [], isLoading: loadingTimesheets } = useTimesheets();

  // Filter timesheets for the selected month
  const monthTimesheets = useMemo(() =>
    timesheets.filter(t => t.work_date >= monthStart && t.work_date <= monthEnd),
    [timesheets, monthStart, monthEnd]
  );

  // Build enriched workers with categories and salary data
  const enrichedWorkers = useMemo<EnrichedWorker[]>(() => {
    return workers.map(w => {
      let category: WorkerCategory = 'temporario';
      let categoryLabel = 'Temporário';
      let linkedName: string | null = null;

      if (w.equipa_membro_id && w.equipa_membro) {
        category = 'equipa';
        categoryLabel = 'Equipa';
        linkedName = w.equipa_membro.nome;
      } else if (w.subempreiteiro_id && w.subempreiteiro) {
        category = 'subempreiteiro';
        categoryLabel = 'Subempreiteiro';
        linkedName = w.subempreiteiro.nome;
      }

      const workerTimesheets = monthTimesheets.filter(t => t.worker_id === w.id);
      const totalMinutes = workerTimesheets.reduce((s, t) => s + (t.total_worked_minutes || 0), 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      const daysWorked = workerTimesheets.length;

      let totalCost = 0;
      if (w.compensation_type === 'salary') {
        totalCost = w.monthly_salary || 0;
      } else {
        totalCost = totalHours * (w.hourly_rate || w.default_hourly_cost || 0);
      }
      totalCost = Math.round(totalCost * 100) / 100;

      return {
        worker: w,
        category,
        categoryLabel,
        linkedName,
        totalHours,
        totalCost,
        monthlySalary: w.monthly_salary || 0,
        daysWorked,
      };
    });
  }, [workers, monthTimesheets]);

  // Apply filters
  const filtered = useMemo(() => {
    return enrichedWorkers.filter(ew => {
      if (categoryFilter !== 'all' && ew.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return ew.worker.full_name.toLowerCase().includes(s) ||
          ew.linkedName?.toLowerCase().includes(s) ||
          ew.worker.role?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [enrichedWorkers, categoryFilter, search]);

  // KPIs
  const totalPayroll = filtered.reduce((s, ew) => s + ew.totalCost, 0);
  const totalHoursAll = filtered.reduce((s, ew) => s + ew.totalHours, 0);
  const avgCostPerHour = totalHoursAll > 0 ? totalPayroll / totalHoursAll : 0;
  const activeWorkers = filtered.filter(ew => ew.worker.active && ew.daysWorked > 0).length;

  const categoryBreakdown = {
    equipa: enrichedWorkers.filter(e => e.category === 'equipa'),
    subempreiteiro: enrichedWorkers.filter(e => e.category === 'subempreiteiro'),
    temporario: enrichedWorkers.filter(e => e.category === 'temporario'),
  };

  const loading = loadingWorkers || loadingTimesheets;

  return (
    <div className="space-y-6">
      {/* Month Selector + KPIs */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Select value={String(monthOffset)} onValueChange={(v) => setMonthOffset(Number(v))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <SelectItem key={i} value={String(i)}>
                {format(subMonths(new Date(), i), 'MMMM yyyy', { locale: pt })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Euro className="h-4 w-4" />Total Salários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
            <p className="text-xs text-muted-foreground capitalize">{monthLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />Total Horas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalHoursAll.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">{filtered.length} trabalhadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />Custo/Hora Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(avgCostPerHour)}</p>
            <p className="text-xs text-muted-foreground">média geral</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />Trabalhadores Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeWorkers}</p>
            <p className="text-xs text-muted-foreground">com registos no mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Equipa</p>
                <p className="text-sm text-muted-foreground">{categoryBreakdown.equipa.length} membros</p>
              </div>
            </div>
            <p className="font-bold">{formatCurrency(categoryBreakdown.equipa.reduce((s, e) => s + e.totalCost, 0))}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardHat className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Subempreiteiros</p>
                <p className="text-sm text-muted-foreground">{categoryBreakdown.subempreiteiro.length} trabalhadores</p>
              </div>
            </div>
            <p className="font-bold">{formatCurrency(categoryBreakdown.subempreiteiro.reduce((s, e) => s + e.totalCost, 0))}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-violet-500" />
              <div>
                <p className="font-medium">Temporários</p>
                <p className="text-sm text-muted-foreground">{categoryBreakdown.temporario.length} trabalhadores</p>
              </div>
            </div>
            <p className="font-bold">{formatCurrency(categoryBreakdown.temporario.reduce((s, e) => s + e.totalCost, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Pesquisar trabalhador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as WorkerCategory)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            <SelectItem value="equipa">Equipa</SelectItem>
            <SelectItem value="subempreiteiro">Subempreiteiro</SelectItem>
            <SelectItem value="temporario">Temporário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workers Table */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">A carregar...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Euro className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhum trabalhador encontrado</p>
          <p className="text-xs mt-1">Registos são criados no Livro de Ponto</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabalhador</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Dias Trab.</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Custo/Hora</TableHead>
                  <TableHead className="text-right">Total Mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(ew => {
                  const w = ew.worker;
                  const hourlyDisplay = w.compensation_type === 'salary'
                    ? '-'
                    : formatCurrency(w.hourly_rate || w.default_hourly_cost || 0);

                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {getInitials(w.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{w.full_name}</p>
                            {w.role && <p className="text-xs text-muted-foreground truncate">{w.role}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ew.category === 'equipa' ? 'default' : ew.category === 'subempreiteiro' ? 'outline' : 'secondary'}
                          className={
                            ew.category === 'subempreiteiro' ? 'border-orange-300 text-orange-700' :
                            ew.category === 'temporario' ? 'border-violet-300 text-violet-700 bg-violet-50' : ''
                          }>
                          {ew.categoryLabel}
                        </Badge>
                        {ew.linkedName && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">{ew.linkedName}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {w.compensation_type === 'salary' ? 'Ordenado' : 'Por Hora'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{ew.daysWorked}</TableCell>
                      <TableCell className="text-right font-medium">{ew.totalHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">{hourlyDisplay}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(ew.totalCost)}</TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{filtered.reduce((s, e) => s + e.daysWorked, 0)}</TableCell>
                  <TableCell className="text-right">{totalHoursAll.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">{formatCurrency(avgCostPerHour)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalPayroll)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
