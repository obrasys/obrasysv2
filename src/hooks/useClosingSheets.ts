import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClosingSheetDetails } from "@/types/closing-sheet";

export type ClosingType = "initial" | "final";
export type ClosingStatus = "draft" | "approved" | "locked";

export interface ClosingSheet {
  id: string;
  source_budget_id: string | null;
  budget_version_id: string | null;
  obra_id: string | null;
  user_id: string;
  closing_type: ClosingType;
  status: ClosingStatus;
  total_direct_cost: number;
  total_indirect_cost: number;
  site_costs: number;
  structure_costs: number;
  contingency_amount: number;
  margin_amount: number;
  margin_percent: number;
  sale_price: number;
  expected_result: number;
  final_result: number | null;
  approved_at: string | null;
  approved_by: string | null;
  locked_at: string | null;
  notes: string | null;
  snapshot: any | null;
  created_at: string;
  updated_at: string;
}

export function useClosingSheets(orcamentoId: string | undefined) {
  return useQuery({
    queryKey: ["closing-sheets", orcamentoId],
    queryFn: async (): Promise<ClosingSheet[]> => {
      if (!orcamentoId) return [];
      const { data, error } = await supabase
        .from("closing_sheets")
        .select("*")
        .eq("source_budget_id", orcamentoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ClosingSheet[];
    },
    enabled: !!orcamentoId,
  });
}
