import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type QuantitativoSource =
  | "medicao"
  | "compartimento"
  | "especialidade"
  | "escada"
  | "outros";

export interface PlanQuantitativoRow {
  id: string;
  plan_import_id: string;
  obra_id: string;
  user_id: string;
  source: QuantitativoSource;
  source_subtype: string;
  descricao: string;
  categoria: string;
  camada: string;
  valor: number;
  unidade: string;
  confidence: string;
  origem: string;
  estado_validacao: string;
  floor_id: string | null;
  page_id: string | null;
  cor: string | null;
  action_type: string | null;
  room_id: string | null;
  symbol_type_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePlanQuantitativosOptions {
  planImportId?: string;
  obraId?: string;
}

/**
 * Reads from the `plan_quantitativos_v` view (Phase 2 unified table).
 * Aggregates measurements, rooms (floor/ceiling/baseboard) and placed
 * elements into a single list with floor, confidence and origin metadata.
 */
export function usePlanQuantitativos({
  planImportId,
  obraId,
}: UsePlanQuantitativosOptions) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["plan-quantitativos", planImportId ?? obraId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("plan_quantitativos_v" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (planImportId) q = q.eq("plan_import_id", planImportId);
      else if (obraId) q = q.eq("obra_id", obraId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PlanQuantitativoRow[];
    },
    enabled: !!user && (!!planImportId || !!obraId),
  });

  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
