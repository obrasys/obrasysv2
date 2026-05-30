import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BudgetChapterTotal {
  numero: number;
  titulo: string;
  total: number;
}

/**
 * Devolve o total de cada capítulo do orçamento (somatório dos artigos:
 * quantidade × preco_unitario). Usado para alimentar, em modo só-leitura,
 * a tabela "Custos Diretos / Preços Secos" da Folha de Fecho.
 */
export function useBudgetChapterTotals(orcamentoId: string | null | undefined) {
  return useQuery({
    queryKey: ["budget-chapter-totals", orcamentoId],
    enabled: !!orcamentoId,
    queryFn: async (): Promise<BudgetChapterTotal[]> => {
      if (!orcamentoId) return [];
      const { data, error } = await supabase
        .from("capitulos_orcamento")
        .select(
          `id, numero, titulo, ordem,
           artigos:artigos_orcamento(quantidade, preco_unitario, valor_total)`
        )
        .eq("orcamento_id", orcamentoId)
        .order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((cap: any) => {
        const total = (cap.artigos ?? []).reduce((s: number, a: any) => {
          const v =
            Number(a.valor_total) ||
            Number(a.quantidade || 0) * Number(a.preco_unitario || 0);
          return s + v;
        }, 0);
        return {
          numero: Number(cap.numero) || 0,
          titulo: cap.titulo || "",
          total,
        };
      });
    },
  });
}
