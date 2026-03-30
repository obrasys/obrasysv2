import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns';

interface LaborSummary {
  todayWorkers: number;
  todayHours: number;
  todayCost: number;
  weekCost: number;
  monthCost: number;
  totalCost: number;
  totalHours: number;
  totalWorkers: number;
}

interface LaborEntry {
  id: string;
  entry_date: string;
  worker_id: string;
  worker_name: string;
  worker_role: string | null;
  hours_worked: number;
  hourly_cost: number;
  amount: number;
  origin_type: string | null;
  status: string | null;
}

interface LaborChartPoint {
  date: string;
  cost: number;
  hours: number;
  workers: number;
}

interface WorkerDistribution {
  worker_id: string;
  worker_name: string;
  total_cost: number;
  total_hours: number;
}

interface CostTypeDistribution {
  origin_type: string;
  total_cost: number;
  total_hours: number;
  count: number;
}

const ORIGIN_LABELS: Record<string, string> = {
  regular: 'Regular',
  overtime: 'Horas Extra',
  night: 'Noturno',
  weekend: 'Fim de Semana',
  timesheet: 'Timesheet',
};

export function getOriginLabel(type: string | null): string {
  return type ? ORIGIN_LABELS[type] || type : 'Regular';
}

export function useObraLaborSummary(obraId: string | undefined) {
  return useQuery({
    queryKey: ['obra-labor-summary', obraId],
    enabled: !!obraId,
    queryFn: async (): Promise<LaborSummary> => {
      const now = new Date();
      const todayStart = format(startOfDay(now), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('project_labor_cost_entries')
        .select('entry_date, worker_id, hours_worked, amount')
        .eq('obra_id', obraId!)
        .neq('status', 'reversed');

      if (error) throw error;
      const entries = data || [];

      const todayEntries = entries.filter(e => e.entry_date === todayStart);
      const weekEntries = entries.filter(e => e.entry_date >= weekStart);
      const monthEntries = entries.filter(e => e.entry_date >= monthStart);

      const uniqueWorkers = (arr: typeof entries) => new Set(arr.map(e => e.worker_id)).size;
      const sumHours = (arr: typeof entries) => arr.reduce((s, e) => s + (e.hours_worked || 0), 0);
      const sumCost = (arr: typeof entries) => arr.reduce((s, e) => s + (e.amount || 0), 0);

      return {
        todayWorkers: uniqueWorkers(todayEntries),
        todayHours: sumHours(todayEntries),
        todayCost: sumCost(todayEntries),
        weekCost: sumCost(weekEntries),
        monthCost: sumCost(monthEntries),
        totalCost: sumCost(entries),
        totalHours: sumHours(entries),
        totalWorkers: uniqueWorkers(entries),
      };
    },
  });
}

export function useObraLaborEntries(
  obraId: string | undefined,
  filters?: { dateFrom?: string; dateTo?: string }
) {
  return useQuery({
    queryKey: ['obra-labor-entries', obraId, filters],
    enabled: !!obraId,
    queryFn: async (): Promise<LaborEntry[]> => {
      let q = supabase
        .from('project_labor_cost_entries')
        .select('id, entry_date, worker_id, hours_worked, hourly_cost, amount, origin_type, status, workers!project_labor_cost_entries_worker_id_fkey(full_name, role)')
        .eq('obra_id', obraId!)
        .neq('status', 'reversed')
        .order('entry_date', { ascending: false });

      if (filters?.dateFrom) q = q.gte('entry_date', filters.dateFrom);
      if (filters?.dateTo) q = q.lte('entry_date', filters.dateTo);

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        entry_date: e.entry_date,
        worker_id: e.worker_id,
        worker_name: e.workers?.full_name || 'Trabalhador',
        worker_role: e.workers?.role || null,
        hours_worked: e.hours_worked || 0,
        hourly_cost: e.hourly_cost || 0,
        amount: e.amount || 0,
        origin_type: e.origin_type,
        status: e.status,
      }));
    },
  });
}

export function useObraLaborChart(obraId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ['obra-labor-chart', obraId, days],
    enabled: !!obraId,
    queryFn: async (): Promise<LaborChartPoint[]> => {
      const from = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('project_labor_cost_entries')
        .select('entry_date, worker_id, hours_worked, amount')
        .eq('obra_id', obraId!)
        .neq('status', 'reversed')
        .gte('entry_date', from)
        .order('entry_date');

      if (error) throw error;

      const grouped = new Map<string, { cost: number; hours: number; workers: Set<string> }>();
      for (const e of data || []) {
        const existing = grouped.get(e.entry_date) || { cost: 0, hours: 0, workers: new Set<string>() };
        existing.cost += e.amount || 0;
        existing.hours += e.hours_worked || 0;
        existing.workers.add(e.worker_id);
        grouped.set(e.entry_date, existing);
      }

      return Array.from(grouped.entries()).map(([date, v]) => ({
        date,
        cost: Math.round(v.cost * 100) / 100,
        hours: Math.round(v.hours * 10) / 10,
        workers: v.workers.size,
      }));
    },
  });
}

export function useObraLaborByWorker(obraId: string | undefined) {
  return useQuery({
    queryKey: ['obra-labor-by-worker', obraId],
    enabled: !!obraId,
    queryFn: async (): Promise<WorkerDistribution[]> => {
      const { data, error } = await supabase
        .from('project_labor_cost_entries')
        .select('worker_id, hours_worked, amount, workers!project_labor_cost_entries_worker_id_fkey(name)')
        .eq('obra_id', obraId!)
        .neq('status', 'reversed');

      if (error) throw error;

      const grouped = new Map<string, { name: string; cost: number; hours: number }>();
      for (const e of (data || []) as any[]) {
        const existing = grouped.get(e.worker_id) || { name: e.workers?.name || 'Trabalhador', cost: 0, hours: 0 };
        existing.cost += e.amount || 0;
        existing.hours += e.hours_worked || 0;
        grouped.set(e.worker_id, existing);
      }

      return Array.from(grouped.entries())
        .map(([worker_id, v]) => ({
          worker_id,
          worker_name: v.name,
          total_cost: Math.round(v.cost * 100) / 100,
          total_hours: Math.round(v.hours * 10) / 10,
        }))
        .sort((a, b) => b.total_cost - a.total_cost);
    },
  });
}

export function useObraLaborByCostType(obraId: string | undefined) {
  return useQuery({
    queryKey: ['obra-labor-by-cost-type', obraId],
    enabled: !!obraId,
    queryFn: async (): Promise<CostTypeDistribution[]> => {
      const { data, error } = await supabase
        .from('project_labor_cost_entries')
        .select('origin_type, hours_worked, amount')
        .eq('obra_id', obraId!)
        .neq('status', 'reversed');

      if (error) throw error;

      const grouped = new Map<string, { cost: number; hours: number; count: number }>();
      for (const e of data || []) {
        const key = e.origin_type || 'regular';
        const existing = grouped.get(key) || { cost: 0, hours: 0, count: 0 };
        existing.cost += e.amount || 0;
        existing.hours += e.hours_worked || 0;
        existing.count += 1;
        grouped.set(key, existing);
      }

      return Array.from(grouped.entries())
        .map(([origin_type, v]) => ({
          origin_type,
          total_cost: Math.round(v.cost * 100) / 100,
          total_hours: Math.round(v.hours * 10) / 10,
          count: v.count,
        }))
        .sort((a, b) => b.total_cost - a.total_cost);
    },
  });
}
