import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BudgetInsight {
  type: "deviation" | "risk" | "opportunity" | "info";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  metric?: string;
}

export interface BudgetInsightsResponse {
  summary: string;
  insights: BudgetInsight[];
  totals: {
    base: number;
    target: number;
    awarded: number;
    purchased: number;
    variance: number;
    variancePct: number;
    consumedPct: number;
  };
  topDeviations: {
    id: string;
    description: string;
    chapter: string | null;
    delta: number;
    base_total: number;
    target_total: number;
  }[];
}

export function useBudgetInsights(orcamentoId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["axia-budget-insights", orcamentoId],
    queryFn: async (): Promise<BudgetInsightsResponse> => {
      const { data, error } = await supabase.functions.invoke("axia-budget-insights", {
        body: { orcamentoId },
      });
      if (error) throw error;
      return data as BudgetInsightsResponse;
    },
    enabled: !!orcamentoId && enabled,
    staleTime: 60_000,
  });
}
