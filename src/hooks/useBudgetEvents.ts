import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BudgetEventType =
  | "budget_created"
  | "budget_submitted_for_review"
  | "budget_approved"
  | "budget_locked"
  | "initial_closing_sheet_created"
  | "target_budget_created"
  | "target_budget_version_created"
  | "target_budget_activated"
  | "target_budget_superseded"
  | "package_created"
  | "quote_received"
  | "award_confirmed"
  | "purchase_registered"
  | "variance_recalculated"
  | "final_closing_sheet_created"
  | "final_closing_sheet_locked";

export interface BudgetEvent {
  id: string;
  source_budget_id: string;
  budget_version_id: string | null;
  obra_id: string | null;
  event_type: BudgetEventType | string;
  entity_type: string | null;
  entity_id: string | null;
  previous_value: any;
  new_value: any;
  description: string | null;
  created_by: string;
  created_at: string;
}

export function useBudgetEvents(orcamentoId: string | undefined) {
  return useQuery({
    queryKey: ["budget-events", orcamentoId],
    queryFn: async (): Promise<BudgetEvent[]> => {
      if (!orcamentoId) return [];
      const { data, error } = await (supabase as any)
        .from("budget_events")
        .select("*")
        .eq("source_budget_id", orcamentoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BudgetEvent[];
    },
    enabled: !!orcamentoId,
  });
}
