import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { FinancialMilestone, FinancialAlert } from '@/types/financial-milestones';

export function useFinancialMilestones(obraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['financial-milestones', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('financial_milestones')
        .select('*')
        .eq('obra_id', obraId)
        .order('planned_date', { ascending: true });
      if (error) throw error;
      return data as FinancialMilestone[];
    },
    enabled: !!user && !!obraId,
  });

  const createMilestone = useMutation({
    mutationFn: async (data: Partial<FinancialMilestone> & { obra_id: string; milestone_type: string; description: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('financial_milestones').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-milestones', obraId] });
      toast({ title: 'Marco financeiro criado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FinancialMilestone> }) => {
      const { error } = await supabase.from('financial_milestones').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial-milestones', obraId] }),
  });

  // Totals
  const totalPlanned = milestones?.reduce((s, m) => s + (m.planned_amount || 0), 0) || 0;
  const totalForecast = milestones?.reduce((s, m) => s + (m.forecast_amount || 0), 0) || 0;
  const totalActual = milestones?.reduce((s, m) => s + (m.actual_amount || 0), 0) || 0;

  const receipts = milestones?.filter(m => m.milestone_type === 'receipt' || m.milestone_type === 'billing') || [];
  const payments = milestones?.filter(m => m.milestone_type === 'supplier_payment') || [];

  return { milestones, isLoading, createMilestone, updateMilestone, totalPlanned, totalForecast, totalActual, receipts, payments };
}

export function useFinancialAlerts(obraId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['financial-alerts', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('financial_alerts')
        .select('*')
        .eq('obra_id', obraId)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data as FinancialAlert[];
    },
    enabled: !!user && !!obraId,
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_alerts').update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial-alerts', obraId] }),
  });

  const openAlerts = alerts?.filter(a => a.status === 'open') || [];
  const criticalAlerts = openAlerts.filter(a => a.severity === 'critical');

  return { alerts, isLoading, acknowledgeAlert, openAlerts, criticalAlerts };
}
