import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { ClosingSheetDetails, ClosingTotals } from "@/types/closing-sheet";

/**
 * Aprova e bloqueia a Folha de Fecho.
 * - status = 'locked'
 * - locked_at, locked_by preenchidos
 * - snapshot guarda os details + totais + cabeçalho
 */
export function useApproveClosingSheet(orcamentoId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      sheetId: string;
      details: ClosingSheetDetails;
      totals: ClosingTotals;
      notes?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id ?? null;

      const snapshot = {
        approved_at: new Date().toISOString(),
        approved_by_name: profile?.nome ?? null,
        approved_by_user_id: userId,
        details: params.details,
        totals: params.totals,
      };

      // 1) Aprovar/bloquear a folha
      const { error } = await supabase
        .from("closing_sheets")
        .update({
          status: "locked",
          approved_at: new Date().toISOString(),
          approved_by: userId,
          locked_at: new Date().toISOString(),
          locked_by: userId,
          snapshot: snapshot as any,
          notes: params.notes ?? null,
        })
        .eq("id", params.sheetId);
      if (error) throw error;

      // 2) A criação automática da Obra é feita por trigger na base de dados
      //    (auto_create_obra_on_closing_sheet_lock), garantindo fiabilidade.

    },
    onSuccess: () => {
      if (orcamentoId) qc.invalidateQueries({ queryKey: ["closing-sheets", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["obras"] });
      toast({ title: "Folha de Fecho aprovada", description: "Obra criada automaticamente." });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" }),
  });
}

