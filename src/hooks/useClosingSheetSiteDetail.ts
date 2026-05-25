import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SiteDetailCategory =
  | "site_labor"
  | "technical_staff"
  | "site_equipment"
  | "utilities"
  | "other_site_costs";

export interface SiteDetailLine {
  id: string;
  closing_sheet_id: string;
  organization_id: string;
  category: SiteDetailCategory;
  description: string;
  useful_percent: number;
  quantity: number;
  months: number;
  monthly_cost: number;
  total_amount: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const SITE_CATEGORY_LABELS: Record<SiteDetailCategory, string> = {
  site_labor: "Pessoal de Obra",
  technical_staff: "Pessoal Técnico",
  site_equipment: "Equipamentos de Estaleiro",
  utilities: "Utilities (Eléct./Água/Telef./Net)",
  other_site_costs: "Outros Gastos",
};

async function getOrgId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: mem } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id ?? null;
}

export function useClosingSheetSiteDetail(closingSheetId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["closing-sheet-site-detail", closingSheetId],
    queryFn: async (): Promise<SiteDetailLine[]> => {
      if (!closingSheetId) return [];
      const { data, error } = await supabase
        .from("closing_sheet_site_detail_lines")
        .select("*")
        .eq("closing_sheet_id", closingSheetId)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SiteDetailLine[];
    },
    enabled: !!closingSheetId,
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<SiteDetailLine> & { id?: string }) => {
      if (!closingSheetId) throw new Error("Sem folha");
      const orgId = await getOrgId();
      if (!orgId) throw new Error("Sem organização");
      if (payload.id) {
        const { id, total_amount, created_at, updated_at, organization_id, closing_sheet_id, ...rest } = payload as any;
        const { error } = await supabase
          .from("closing_sheet_site_detail_lines")
          .update(rest)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("closing_sheet_site_detail_lines").insert({
          closing_sheet_id: closingSheetId,
          organization_id: orgId,
          category: payload.category || "site_labor",
          description: payload.description || "",
          useful_percent: payload.useful_percent ?? 1,
          quantity: payload.quantity ?? 1,
          months: payload.months ?? 1,
          monthly_cost: payload.monthly_cost ?? 0,
          notes: payload.notes ?? null,
          sort_order: payload.sort_order ?? 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["closing-sheet-site-detail", closingSheetId] });
      qc.invalidateQueries({ queryKey: ["closing-sheets"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("closing_sheet_site_detail_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["closing-sheet-site-detail", closingSheetId] });
      qc.invalidateQueries({ queryKey: ["closing-sheets"] });
    },
  });

  return { list, upsert, remove };
}
