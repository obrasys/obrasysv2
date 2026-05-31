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

      // 2) Criar Obra automaticamente (se ainda não existir associada)
      const { data: sheet } = await supabase
        .from("closing_sheets")
        .select("id, obra_id, source_budget_id, sale_price, organization_id, user_id")
        .eq("id", params.sheetId)
        .maybeSingle();

      if (sheet && !sheet.obra_id && sheet.source_budget_id) {
        const { data: orc } = await supabase
          .from("orcamentos")
          .select("titulo, cliente_id, valor_total, obra_id")
          .eq("id", sheet.source_budget_id)
          .maybeSingle();

        // Se o orçamento já tem obra associada, reutiliza
        let obraId = orc?.obra_id ?? null;

        if (!obraId) {
          const valor =
            Number(sheet.sale_price ?? 0) ||
            Number(params.totals?.valor_vendas ?? 0) ||
            Number(orc?.valor_total ?? 0);

          const { data: novaObra, error: obraErr } = await supabase
            .from("obras")
            .insert({
              nome: orc?.titulo ?? "Nova Obra",
              cliente_id: orc?.cliente_id ?? null,
              valor_previsto: valor,
              status: "planeamento",
              user_id: sheet.user_id ?? userId!,
            })
            .select("id")
            .single();
          if (obraErr) throw obraErr;
          obraId = novaObra.id;
        }

        // Atualiza closing sheet + orçamento base
        await supabase.from("closing_sheets").update({ obra_id: obraId }).eq("id", params.sheetId);
        await supabase.from("orcamentos").update({ obra_id: obraId }).eq("id", sheet.source_budget_id);
      }
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

