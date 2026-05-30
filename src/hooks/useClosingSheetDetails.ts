import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ClosingSheetDetails, ClosingTotals } from "@/types/closing-sheet";

export function useUpdateClosingSheetDetails(orcamentoId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      sheetId: string;
      details: ClosingSheetDetails;
      totals: ClosingTotals;
    }) => {
      const { data, error } = await supabase
        .from("closing_sheets")
        .update({
          details: params.details as any,
          total_direct_cost: params.totals.total_directos,
          total_indirect_cost: params.totals.total_indiretos,
          site_costs: params.totals.total_estaleiro,
          structure_costs: params.totals.total_admin,
          contingency_amount: params.totals.total_outros,
          margin_amount: params.totals.rai_eur,
          margin_percent: params.totals.rai_pct * 100,
          sale_price: params.totals.valor_vendas,
          expected_result: params.totals.rai_eur,
        })
        .eq("id", params.sheetId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Sem permissão para gravar (folha bloqueada).");
      }
    },
    onSuccess: () => {
      if (orcamentoId) qc.invalidateQueries({ queryKey: ["closing-sheets", orcamentoId] });
      toast({ title: "Folha de Fecho actualizada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao gravar", description: e.message, variant: "destructive" }),
  });
}
