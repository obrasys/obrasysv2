import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IcfBudgetSnapshotRow {
  id: string;
  user_id: string;
  orcamento_id: string;
  obra_id: string;
  configuracao_id: string;
  config_snapshot: Record<string, unknown>;
  resumo_snapshot: Record<string, unknown>;
  chapters_snapshot: Array<{
    numero: number;
    titulo: string;
    descricao?: string;
    artigos: Array<{
      descricao: string;
      unidade: string;
      quantidade: number;
      preco_unitario: number;
    }>;
  }>;
  parametros: { margem_lucro?: number; custos_indiretos?: Record<string, unknown> };
  created_at: string;
}

/**
 * Snapshot imutável da geração ICF que originou um orçamento.
 * Permite comparar, regenerar ou auditar mesmo após edições manuais.
 */
export function useIcfBudgetSnapshot(orcamentoId?: string) {
  return useQuery({
    queryKey: ['icf-budget-snapshot', orcamentoId],
    enabled: !!orcamentoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('icf_budget_snapshots')
        .select('*')
        .eq('orcamento_id', orcamentoId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as IcfBudgetSnapshotRow | null;
    },
  });
}
