import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ObraPurchase {
  id: string;
  user_id: string;
  obra_id: string | null;
  source_budget_id: string | null;
  budget_version_id: string | null;
  budget_version_item_id: string | null;
  package_id: string | null;
  supplier_id: string | null;
  description: string;
  invoice_number: string | null;
  invoice_date: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: "registered" | "paid" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useObraPurchases(params: {
  orcamentoId?: string;
  obraId?: string;
}) {
  const key = params.orcamentoId ?? params.obraId ?? "none";
  return useQuery({
    queryKey: ["obra-purchases", key],
    queryFn: async (): Promise<ObraPurchase[]> => {
      let q = supabase.from("obra_purchases").select("*").order("created_at", { ascending: false });
      if (params.orcamentoId) q = q.eq("source_budget_id", params.orcamentoId);
      else if (params.obraId) q = q.eq("obra_id", params.obraId);
      else return [];
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ObraPurchase[];
    },
    enabled: !!(params.orcamentoId || params.obraId),
  });
}

export function useRegisterPurchase() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      orcamentoId?: string;
      obraId: string | null;
      description: string;
      totalAmount: number;
      supplierId?: string;
      budgetVersionItemId?: string;
      packageId?: string;
      invoiceNumber?: string;
      invoiceDate?: string;
      quantity?: number;
      unitPrice?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("register_purchase", {
        _obra_id: params.obraId,
        _description: params.description,
        _total_amount: params.totalAmount,
        _supplier_id: params.supplierId ?? null,
        _budget_version_item_id: params.budgetVersionItemId ?? null,
        _package_id: params.packageId ?? null,
        _invoice_number: params.invoiceNumber ?? null,
        _invoice_date: params.invoiceDate ?? null,
        _quantity: params.quantity ?? 1,
        _unit_price: params.unitPrice ?? null,
        _notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["obra-purchases"] });
      qc.invalidateQueries({ queryKey: ["budget-version-items"] });
      if (p.orcamentoId) {
        qc.invalidateQueries({ queryKey: ["budget-versions", p.orcamentoId] });
        qc.invalidateQueries({ queryKey: ["budget-events", p.orcamentoId] });
      }
      toast({ title: "Compra registada", description: "Valor atualizado no Budget Objetivo." });
    },
    onError: (e: any) =>
      toast({ title: "Erro a registar compra", description: e.message, variant: "destructive" }),
  });
}

export function useGenerateFinalClosing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { orcamentoId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc("generate_final_closing_sheet", {
        _orcamento_id: params.orcamentoId,
        _notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["closing-sheets", p.orcamentoId] });
      qc.invalidateQueries({ queryKey: ["budget-versions", p.orcamentoId] });
      qc.invalidateQueries({ queryKey: ["budget-events", p.orcamentoId] });
      toast({
        title: "Folha de Fecho Final gerada",
        description: "Versão ativa bloqueada e consolidada.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Erro a gerar fecho final", description: e.message, variant: "destructive" }),
  });
}
