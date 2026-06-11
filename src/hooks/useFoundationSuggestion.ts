import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FoundationInputs {
  numero_pisos: number;
  tem_cave: boolean;
  tem_garagem: boolean;
  tipo_terreno?: string;
  icf_integral: boolean;
  muros_contencao: boolean;
  grandes_vaos: boolean;
  tipo_laje_terrea?: string;
  altura_pisos_m?: number;
  localizacao?: string;
}

export interface FoundationItem {
  tipo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  metodo_calculo?: string;
  confidence?: number;
  observacoes?: string;
}

export interface FoundationSession {
  id: string;
  plan_import_id: string;
  obra_id: string;
  status: "draft" | "gerado" | "aplicado" | "descartado";
  inputs: FoundationInputs;
  result: {
    items?: FoundationItem[];
    summary?: string;
    missing_data?: string[];
    overall_confidence?: number;
  };
  generated_at: string | null;
  applied_at: string | null;
  created_at: string;
}

export function useFoundationSuggestion(planImportId?: string, obraId?: string) {
  const { session } = useAuth();
  const qc = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["foundation-suggestions", planImportId],
    enabled: !!planImportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_foundation_suggestions" as any)
        .select("*")
        .eq("plan_import_id", planImportId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FoundationSession[];
    },
  });

  const generate = useMutation({
    mutationFn: async (payload: {
      inputs: FoundationInputs;
      area_implantacao_m2?: number;
      perimetro_exterior_m?: number;
    }) => {
      if (!planImportId || !obraId) throw new Error("Plan/Obra em falta");
      if (!session?.access_token) throw new Error("Sessão expirada");
      const { data, error } = await supabase.functions.invoke("axia-foundation-suggestion", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          plan_import_id: planImportId,
          obra_id: obraId,
          inputs: payload.inputs,
          area_implantacao_m2: payload.area_implantacao_m2,
          perimetro_exterior_m: payload.perimetro_exterior_m,
        },
      });
      if (error) throw error;
      return data as { session_id: string; result: FoundationSession["result"] };
    },
    onSuccess: () => {
      toast.success("Sugestão preliminar gerada. Requer validação técnica.");
      qc.invalidateQueries({ queryKey: ["foundation-suggestions", planImportId] });
    },
    onError: (e: any) => toast.error("Falha a gerar sugestão: " + (e?.message ?? "erro")),
  });

  const discard = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("plan_foundation_suggestions" as any)
        .update({ status: "descartado" })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["foundation-suggestions", planImportId] }),
  });

  return {
    sessions: sessionsQuery.data ?? [],
    latest: (sessionsQuery.data ?? [])[0] ?? null,
    isLoading: sessionsQuery.isLoading,
    generate,
    discard,
  };
}
