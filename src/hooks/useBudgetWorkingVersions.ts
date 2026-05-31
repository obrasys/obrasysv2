import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BudgetVersionStatus =
  | "rascunho"
  | "em_revisao"
  | "aprovado"
  | "ativa"
  | "arquivada"
  // legacy
  | "active"
  | "locked";

export interface BudgetWorkingVersion {
  id: string;
  titulo: string;
  status: string;
  valor_total: number;
  budget_version_number: number;
  budget_version_status: BudgetVersionStatus;
  revisao_de: string;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
  version_name: string | null;
  version_reason: string | null;
  version_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

const SELECT_COLS =
  "id, titulo, status, valor_total, budget_version_number, budget_version_status, revisao_de, created_at, updated_at, is_locked, version_name, version_reason, version_notes, approved_by, approved_at";

/** Lista todas as versões de trabalho do Budget para um orçamento base. */
export function useBudgetWorkingVersions(baseOrcamentoId: string | undefined) {
  return useQuery({
    queryKey: ["budget-working-versions", baseOrcamentoId],
    enabled: !!baseOrcamentoId,
    queryFn: async (): Promise<BudgetWorkingVersion[]> => {
      if (!baseOrcamentoId) return [];
      const { data, error } = await supabase
        .from("orcamentos")
        .select(SELECT_COLS)
        .eq("revisao_de", baseOrcamentoId)
        .not("budget_version_number", "is", null)
        .order("budget_version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BudgetWorkingVersion[];
    },
  });
}

export function useCreateBudgetWorkingVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      baseId: string;
      cloneFrom?: string;
      name?: string;
      reason?: string;
      notes?: string;
    }) => {
      const hasMeta = params.name || params.reason || params.notes;
      if (hasMeta) {
        const { data, error } = await supabase.rpc("create_budget_version_named", {
          p_base_id: params.baseId,
          p_clone_from: params.cloneFrom ?? params.baseId,
          p_name: params.name ?? null,
          p_reason: params.reason ?? null,
          p_notes: params.notes ?? null,
        });
        if (error) throw error;
        return data as string;
      }
      const { data, error } = await supabase.rpc("create_budget_working_version", {
        p_base_id: params.baseId,
        p_clone_from: params.cloneFrom ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, params) => {
      qc.invalidateQueries({ queryKey: ["budget-working-versions", params.baseId] });
      toast({ title: "Nova versão criada", description: "Já podes editar a nova versão do Budget." });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao criar versão", description: e?.message ?? "Tenta novamente.", variant: "destructive" }),
  });
}

export function useLockBudgetWorkingVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { budgetId: string; baseId: string }) => {
      const { error } = await supabase.rpc("lock_budget_working_version", { p_budget_id: params.budgetId });
      if (error) throw error;
    },
    onSuccess: (_d, params) => qc.invalidateQueries({ queryKey: ["budget-working-versions", params.baseId] }),
    onError: (e: any) =>
      toast({ title: "Erro ao gravar versão", description: e?.message ?? "Tenta novamente.", variant: "destructive" }),
  });
}

export function useApproveBudgetVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { versionId: string; baseId: string }) => {
      const { error } = await supabase.rpc("approve_budget_version", { p_version_id: params.versionId });
      if (error) throw error;
    },
    onSuccess: (_d, params) => {
      qc.invalidateQueries({ queryKey: ["budget-working-versions", params.baseId] });
      toast({ title: "Versão aprovada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
}

export function useSetActiveBudgetVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { versionId: string; baseId: string }) => {
      const { error } = await supabase.rpc("set_active_budget_version", { p_version_id: params.versionId });
      if (error) throw error;
    },
    onSuccess: (_d, params) => {
      qc.invalidateQueries({ queryKey: ["budget-working-versions", params.baseId] });
      toast({ title: "Versão definida como ativa" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
}

export function useArchiveBudgetVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { versionId: string; baseId: string }) => {
      const { error } = await supabase.rpc("archive_budget_version", { p_version_id: params.versionId });
      if (error) throw error;
    },
    onSuccess: (_d, params) => {
      qc.invalidateQueries({ queryKey: ["budget-working-versions", params.baseId] });
      toast({ title: "Versão arquivada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
}

export function isVersionActive(v: BudgetWorkingVersion) {
  return v.budget_version_status === "ativa" || v.budget_version_status === "active";
}

export function versionStatusLabel(s: BudgetVersionStatus): { label: string; tone: string } {
  switch (s) {
    case "ativa":
    case "active":
      return { label: "Ativa", tone: "bg-primary text-primary-foreground" };
    case "rascunho":
      return { label: "Rascunho", tone: "bg-muted text-muted-foreground" };
    case "em_revisao":
      return { label: "Em Revisão", tone: "bg-amber-100 text-amber-700" };
    case "aprovado":
      return { label: "Aprovado", tone: "bg-emerald-100 text-emerald-700" };
    case "arquivada":
    case "locked":
      return { label: "Arquivada", tone: "bg-slate-100 text-slate-600" };
    default:
      return { label: s, tone: "bg-muted text-muted-foreground" };
  }
}
