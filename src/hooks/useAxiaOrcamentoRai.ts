import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { OrcamentoRaiConsolidation } from '@/types/orcamento-rai';

export interface AxiaRaiInsight {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  category: 'rai' | 'margem' | 'desvio' | 'mce' | 'fluxo' | 'pos_venda';
}

export function useAxiaOrcamentoRai() {
  return useMutation({
    mutationFn: async (consolidation: OrcamentoRaiConsolidation) => {
      const { data, error } = await supabase.functions.invoke('orcamento-rai-axia', {
        body: { consolidation },
      });
      if (error) throw error;
      return data as { insights: AxiaRaiInsight[]; source: string };
    },
    onError: (e: Error) =>
      toast({ title: 'Axia indisponível', description: e.message, variant: 'destructive' }),
  });
}
