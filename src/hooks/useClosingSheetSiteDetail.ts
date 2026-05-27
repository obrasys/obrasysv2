import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SiteDetailCategory =
  | "technical_staff"
  | "site_supervisors"
  | "team_leaders"
  | "utilities"
  | "site_equipment"
  | "site_guard"
  | "site_labor"
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
  technical_staff: "A - Pessoal Técnico",
  site_supervisors: "B - Encarregados",
  team_leaders: "C - Chefes de Equipa / Seguidor",
  utilities: "D - Outros Gastos (Água / Electricidade / Telef. / Net)",
  site_equipment: "E - Equipamentos de Estaleiro",
  site_guard: "F - Guarda",
  site_labor: "G - Pessoal de Obra",
  other_site_costs: "G - Outro",
};

export const SITE_CATEGORY_DEFAULTS: Record<SiteDetailCategory, string[]> = {
  technical_staff: [
    "Director Projecto",
    "Gestor Projecto",
    "Técnico de Instalações Especiais",
    "Coordenador Segurança",
    "Decorador(a) Interiores / 3D Arquitecto(a)",
  ],
  site_supervisors: [
    "Encarregado Geral",
    "Encarregado",
  ],
  team_leaders: [
    "Chefe de Equipa / Seguidor",
  ],
  utilities: [
    "Água",
    "Electricidade",
    "Telefone + Internet",
    "Aluguer",
  ],
  site_equipment: [
    "Grua Torre",
    "Grua Automontante (Rápida)",
    "Grua Móvel",
    "Bases em Betão",
    "Montagem / Desmontagem Grua",
    "Transporte Grua",
    "Camião Grua",
    "Carrinha",
    "Retro",
    "Escavadora",
    "Camião",
    "Outros Equipamentos Pesados",
    "Transportes",
    "Betoneira",
    "Instalações Provisórias",
    "Material Diversos",
    "Gerador",
    "Painéis Obra Amovíveis / Rede Bekahert (ml)",
    "Vedação Obra com Chapa Opaca (ml)",
    "Andaimes (Próprios)",
    "Andaimes Montagem (m2)",
    "Andaimes Aluguer (m2)",
    "Topógrafo (Fase de Obra / Check in situ)",
    "Reparações",
    "Ocupação de Via Pública (m2)",
    "Contentor / Bungalows (Base de Vida)",
    "Escritório / Stand Vendas Mobiliário de Escritório de Obra",
    "Limpeza dos Contentores da Base de Vida",
    "Sanitários WC Fixo",
    "Ferramentaria",
    "Contentor de Lixo (Ecobaldes)",
    "Sacos Big Bags",
    "Painéis de Publicidade / Placa de Obra",
    "Aluguer Diverso",
    "Manta Protecção de Pavimentos",
    "Protecções Colectivas (Guardas Seg.)",
    "EPI's",
    "Telas Finais",
    "Desmontagem do Estaleiro",
  ],
  site_guard: [
    "Guarda",
  ],
  site_labor: [
    "Pedreiro",
    "Servente",
    "Gruista",
  ],
  other_site_costs: [
    "Outro",
  ],
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
