import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ContractingPackage {
  id: string;
  user_id: string;
  organization_id: string | null;
  obra_id: string | null;
  source_budget_id: string | null;
  budget_version_id: string | null;
  name: string;
  description: string | null;
  chapter_code: string | null;
  chapter_name: string | null;
  status: "draft" | "in_quote" | "awarded" | "cancelled";
  awarded_supplier_id: string | null;
  estimated_total: number;
  awarded_total: number;
  awarded_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Pacotes de contratação de um orçamento. */
export function useContractingPackages(orcamentoId: string | undefined) {
  return useQuery({
    queryKey: ["contracting-packages", orcamentoId],
    queryFn: async (): Promise<ContractingPackage[]> => {
      if (!orcamentoId) return [];
      const { data, error } = await supabase
        .from("contracting_packages")
        .select("*")
        .eq("source_budget_id", orcamentoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractingPackage[];
    },
    enabled: !!orcamentoId,
  });
}

export function useCreateContractingPackage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      orcamentoId: string;
      versionId: string;
      name: string;
      itemIds: string[];
      description?: string;
      chapterCode?: string;
      chapterName?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_contracting_package", {
        _budget_version_id: params.versionId,
        _name: params.name,
        _item_ids: params.itemIds,
        _description: params.description ?? null,
        _chapter_code: params.chapterCode ?? null,
        _chapter_name: params.chapterName ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["contracting-packages", p.orcamentoId] });
      qc.invalidateQueries({ queryKey: ["budget-version-items", p.versionId] });
      toast({ title: "Pacote criado", description: "Itens agrupados para cotação." });
    },
    onError: (e: any) =>
      toast({ title: "Erro a criar pacote", description: e.message, variant: "destructive" }),
  });
}

export function useConfirmAward() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      orcamentoId: string;
      versionId: string;
      packageId: string;
      supplierId: string;
      awardedTotal: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("confirm_award", {
        _package_id: params.packageId,
        _supplier_id: params.supplierId,
        _awarded_total: params.awardedTotal,
        _notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["contracting-packages", p.orcamentoId] });
      qc.invalidateQueries({ queryKey: ["budget-version-items", p.versionId] });
      qc.invalidateQueries({ queryKey: ["budget-versions", p.orcamentoId] });
      qc.invalidateQueries({ queryKey: ["budget-events", p.orcamentoId] });
      toast({ title: "Adjudicação confirmada", description: "Pacote adjudicado ao fornecedor." });
    },
    onError: (e: any) =>
      toast({ title: "Erro a adjudicar", description: e.message, variant: "destructive" }),
  });
}

/** Lista simples de fornecedores ativos para dropdowns. */
export function useActiveSuppliers() {
  return useQuery({
    queryKey: ["active-suppliers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });
}
