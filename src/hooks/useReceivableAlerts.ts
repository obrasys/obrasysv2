import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format } from 'date-fns';

export interface ReceivableWithAlert {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
  paid_amount: number;
  remaining_amount: number;
  obra_id: string | null;
  client_id: string | null;
  source_type: string;
  alerts: {
    id: string;
    alert_type: string;
    status: string;
    scheduled_for: string;
  }[];
}

export function useReceivableAlerts(obraId?: string) {
  const { user } = useAuth();

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ['receivable-alerts', obraId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let q = supabase
        .from('receivables')
        .select(`
          id, title, amount, due_date, status, paid_amount, remaining_amount,
          obra_id, client_id, source_type,
          receivable_alerts(id, alert_type, status, scheduled_for)
        `)
        .in('status', ['open', 'pending', 'partially_paid'])
        .order('due_date', { ascending: true });

      if (obraId) {
        q = q.eq('obra_id', obraId);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((r: any) => ({
        ...r,
        alerts: r.receivable_alerts || [],
      })) as ReceivableWithAlert[];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const today = new Date();
  const in5Days = addDays(today, 5);
  const todayStr = format(today, 'yyyy-MM-dd');
  const in5DaysStr = format(in5Days, 'yyyy-MM-dd');

  const dueSoon = receivables.filter(
    r => r.due_date >= todayStr && r.due_date <= in5DaysStr
  );

  const overdue = receivables.filter(r => r.due_date < todayStr);

  const activeAlerts = receivables.filter(
    r => r.alerts.some(a => a.status === 'sent' || a.status === 'pending')
  );

  return {
    receivables,
    dueSoon,
    overdue,
    activeAlerts,
    isLoading,
    totalDueSoon: dueSoon.length,
    totalOverdue: overdue.length,
  };
}
