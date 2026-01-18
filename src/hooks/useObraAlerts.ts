import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isWeekend, subDays, differenceInBusinessDays, parseISO, format } from 'date-fns';
import { pt } from 'date-fns/locale';

export interface ObraAlert {
  id: string;
  obraId: string;
  obraNome: string;
  obraCliente: string | null;
  type: 'missing_rdo' | 'no_rdo_ever' | 'pending_approval';
  severity: 'warning' | 'error';
  message: string;
  daysMissing?: number;
  lastRdoDate?: string;
}

interface ObraWithRDO {
  id: string;
  nome: string;
  cliente: string | null;
  status: string;
  lastRdoDate: string | null;
  pendingRdos: number;
}

export function useObraAlerts() {
  const { user } = useAuth();

  const { data: obrasData, isLoading } = useQuery({
    queryKey: ['obra-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get active obras (em_curso only - these should have RDOs)
      const { data: obras, error: obrasError } = await supabase
        .from('obras')
        .select('id, nome, cliente, status')
        .eq('user_id', user.id)
        .eq('arquivada', false)
        .eq('status', 'em_curso');

      if (obrasError) throw obrasError;

      // Get RDO info for each obra
      const obrasWithRDO: ObraWithRDO[] = await Promise.all(
        (obras || []).map(async (obra) => {
          // Get latest RDO date
          const { data: latestRDO } = await supabase
            .from('relatorios_diarios')
            .select('data')
            .eq('obra_id', obra.id)
            .order('data', { ascending: false })
            .limit(1)
            .single();

          // Count pending RDOs (submetido status)
          const { count: pendingCount } = await supabase
            .from('relatorios_diarios')
            .select('id', { count: 'exact', head: true })
            .eq('obra_id', obra.id)
            .eq('status', 'submetido');

          return {
            id: obra.id,
            nome: obra.nome,
            cliente: obra.cliente,
            status: obra.status,
            lastRdoDate: latestRDO?.data || null,
            pendingRdos: pendingCount || 0,
          };
        })
      );

      return obrasWithRDO;
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Calculate alerts based on business days
  const alerts = useMemo(() => {
    if (!obrasData) return [];

    const today = new Date();
    const alertsList: ObraAlert[] = [];

    obrasData.forEach((obra) => {
      // Check for pending approvals
      if (obra.pendingRdos > 0) {
        alertsList.push({
          id: `pending-${obra.id}`,
          obraId: obra.id,
          obraNome: obra.nome,
          obraCliente: obra.cliente,
          type: 'pending_approval',
          severity: 'warning',
          message: `${obra.pendingRdos} RDO${obra.pendingRdos > 1 ? 's' : ''} aguardando aprovação`,
        });
      }

      // Check for missing RDOs
      if (!obra.lastRdoDate) {
        // No RDO ever registered
        alertsList.push({
          id: `no-rdo-${obra.id}`,
          obraId: obra.id,
          obraNome: obra.nome,
          obraCliente: obra.cliente,
          type: 'no_rdo_ever',
          severity: 'error',
          message: 'Nenhum RDO registado desde o início da obra',
        });
      } else {
        // Calculate business days since last RDO
        const lastDate = parseISO(obra.lastRdoDate);
        const businessDaysMissing = differenceInBusinessDays(today, lastDate);

        if (businessDaysMissing > 2) {
          alertsList.push({
            id: `missing-${obra.id}`,
            obraId: obra.id,
            obraNome: obra.nome,
            obraCliente: obra.cliente,
            type: 'missing_rdo',
            severity: businessDaysMissing > 5 ? 'error' : 'warning',
            message: `Sem RDO há ${businessDaysMissing} dias úteis`,
            daysMissing: businessDaysMissing,
            lastRdoDate: format(lastDate, "d 'de' MMM", { locale: pt }),
          });
        }
      }
    });

    // Sort by severity (errors first) then by days missing
    return alertsList.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1;
      }
      return (b.daysMissing || 0) - (a.daysMissing || 0);
    });
  }, [obrasData]);

  const errorCount = alerts.filter(a => a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const totalAlerts = alerts.length;

  return {
    alerts,
    isLoading,
    errorCount,
    warningCount,
    totalAlerts,
    hasAlerts: totalAlerts > 0,
  };
}
