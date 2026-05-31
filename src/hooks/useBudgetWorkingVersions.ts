import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BudgetWorkingVersion {
  id: string;
  titulo: string;
  status: string;
  valor_total: number;
  budget_version_number: number;
  budget_version_status: "active" | "locked";
  revisao_de: string;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
}

/** Lista todas as versões de trabalho do Budget para um orçamento base. */
export function useBudgetWorkingVersions(baseOrcamentoId: string | undefined) {
  return useQuery({
    queryKey: ["budget-working-versions", baseOrcamentoId],
    enabled: !!baseOrcamentoId,
    queryFn: async (): Promise<BudgetWorkingVersion[]> => {
      if (!baseOrcamentoId) return [];
      const { data, error } = await supabase
        .from("orcamentos")
        .select(
          "id, titulo, status, valor_total, budget_version_number, budget_version_status, revisao_de, created_at, updated_at, is_locked",
        )
        .eq("revisao_de", baseOrcamentoId)
        .not("budget_version_number", "is", null)
        .order("budget_version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BudgetWorkingVersion[];
    },
  });
}

/** Cria nova versão de trabalho do Budget (clona base ou versão indicada). */
export function useCreateBudgetWorkingVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { baseId: string; cloneFrom?: string }) => {
      const { data, error } = await supabase.rpc("create_budget_working_version", {
        p_base_id: params.baseId,
        p_clone_from: params.cloneFrom ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, params) => {
      qc.invalidateQueries({ queryKey: ["budget-working-versions", params.baseId] });
      toast({
        title: "Nova versão criada",
        description: "Já podes editar a nova versão do Budget.",
      });
    },
    onError: (e: any) =>
      toast({
        title: "Erro ao criar versão",
        description: e?.message ?? "Tenta novamente.",
        variant: "destructive",
      }),
  });
}

/** Fecha (lock) uma versão de trabalho do Budget. */
export function useLockBudgetWorkingVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { budgetId: string; baseId: string }) => {
      const { error } = await supabase.rpc("lock_budget_working_version", {
        p_budget_id: params.budgetId,
      });
      if (error) throw error;
    },
    onSuccess: (_d, params) => {
      qc.invalidateQueries({ queryKey: ["budget-working-versions", params.baseId] });
    },
    onError: (e: any) =>
      toast({
        title: "Erro ao gravar versão",
        description: e?.message ?? "Tenta novamente.",
        variant: "destructive",
      }),
  });
}
