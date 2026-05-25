import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BudgetVersionType = "base_dry" | "target" | "initial_closing" | "final_closing";
export type BudgetVersionStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "locked"
  | "active"
  | "superseded"
  | "closed"
  | "archived";

export interface BudgetVersion {
  id: string;
  source_budget_id: string;
  obra_id: string | null;
  user_id: string;
  organization_id: string | null;
  version_type: BudgetVersionType;
  version_number: number;
  version_name: string | null;
  status: BudgetVersionStatus;
  parent_version_id: string | null;
  reason: string | null;
  total_base: number;
  total_target: number;
  total_awarded: number;
  total_purchased: number;
  total_remaining: number;
  variance_from_base: number;
  variance_from_previous: number;
  approved_at: string | null;
  approved_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetVersionItem {
  id: string;
  budget_version_id: string;
  source_capitulo_id: string | null;
  source_artigo_id: string | null;
  chapter_code: string | null;
  chapter_name: string | null;
  codigo: string | null;
  description: string;
  unit: string | null;
  ordem: number;
  base_quantity: number;
  base_unit_price: number;
  base_total: number;
  target_quantity: number;
  target_unit_price: number;
  target_total: number;
  awarded_amount: number;
  purchased_amount: number;
  remaining_amount: number;
  variance_from_base: number;
  variance_from_previous: number;
  contracting_status: string;
  package_id: string | null;
  supplier_id: string | null;
  notes: string | null;
}

/** Todas as versões (Base + Target + Closings) deste orçamento, ordenadas. */
export function useBudgetVersions(orcamentoId: string | undefined) {
  return useQuery({
    queryKey: ["budget-versions", orcamentoId],
    queryFn: async (): Promise<BudgetVersion[]> => {
      if (!orcamentoId) return [];
      const { data, error } = await supabase
        .from("budget_versions")
        .select("*")
        .eq("source_budget_id", orcamentoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BudgetVersion[];
    },
    enabled: !!orcamentoId,
  });
}

/** Itens (linhas) de uma versão. */
export function useBudgetVersionItems(versionId: string | undefined | null) {
  return useQuery({
    queryKey: ["budget-version-items", versionId],
    queryFn: async (): Promise<BudgetVersionItem[]> => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from("budget_version_items")
        .select("*")
        .eq("budget_version_id", versionId)
        .order("chapter_code", { ascending: true, nullsFirst: false })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BudgetVersionItem[];
    },
    enabled: !!versionId,
  });
}

/** Aprova o Orçamento Base Seco: bloqueia, gera Folha de Fecho Inicial + Budget Objetivo v1. */
export function useApproveBaseDryBudget() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orcamentoId: string) => {
      const { data, error } = await supabase.rpc("approve_base_dry_budget", {
        p_orcamento_id: orcamentoId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, orcamentoId) => {
      qc.invalidateQueries({ queryKey: ["budget-versions", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["closing-sheets", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      toast({
        title: "Orçamento Base Seco aprovado",
        description:
          "Orçamento bloqueado. Folha de Fecho Inicial e Budget Objetivo v1 gerados.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Erro a aprovar",
        description: e.message ?? "Não foi possível aprovar o Orçamento Base.",
        variant: "destructive",
      });
    },
  });
}

/** Cria nova versão do Budget Objetivo (incrementa version_number, marca anterior como superseded). */
export function useCreateNewTargetVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { orcamentoId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("create_new_target_version", {
        p_source_budget_id: params.orcamentoId,
        p_reason: params.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, params) => {
      qc.invalidateQueries({ queryKey: ["budget-versions", params.orcamentoId] });
      toast({
        title: "Nova versão criada",
        description: "Budget Objetivo atualizado para nova versão ativa.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Erro a criar nova versão",
        description: e.message ?? "Não foi possível criar nova versão.",
        variant: "destructive",
      });
    },
  });
}
