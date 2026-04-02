import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanMeasurementMapping, MappingState } from "@/types/plan-measurements";

export function usePlanMappings(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all measurements for this plan, then fetch mappings for those measurement IDs
  const mappingsQuery = useQuery({
    queryKey: ["plan-mappings", planImportId],
    queryFn: async () => {
      if (!planImportId) return [];

      // First get measurement IDs for this plan
      const { data: measurements, error: mError } = await supabase
        .from("plan_measurements")
        .select("id")
        .eq("plan_import_id", planImportId);
      if (mError) throw mError;
      if (!measurements?.length) return [];

      const measurementIds = measurements.map((m) => m.id);

      const { data, error } = await supabase
        .from("plan_measurement_mappings")
        .select("*")
        .in("measurement_id", measurementIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PlanMeasurementMapping[];
    },
    enabled: !!planImportId && !!user,
  });

  const createMapping = useMutation({
    mutationFn: async ({
      measurementId,
      artigoBaseId,
      unidadeArtigo,
      formulaConversao,
      fatorDesperdicio,
      coeficiente,
    }: {
      measurementId: string;
      artigoBaseId?: string;
      unidadeArtigo?: string;
      formulaConversao?: string;
      fatorDesperdicio?: number;
      coeficiente?: number;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("plan_measurement_mappings")
        .insert({
          measurement_id: measurementId,
          user_id: user.id,
          artigo_base_id: artigoBaseId || null,
          unidade_artigo: unidadeArtigo || null,
          formula_conversao: formulaConversao || null,
          fator_desperdicio: fatorDesperdicio ?? 1.0,
          coeficiente: coeficiente ?? 1.0,
          estado: artigoBaseId ? "mapeado" : "por_mapear",
        })
        .select()
        .single();
      if (error) throw error;
      return data as PlanMeasurementMapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-mappings", planImportId] });
      toast.success("Mapeamento criado");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const updateMapping = useMutation({
    mutationFn: async ({
      id,
      artigoBaseId,
      unidadeArtigo,
      formulaConversao,
      fatorDesperdicio,
      coeficiente,
      estado,
    }: {
      id: string;
      artigoBaseId?: string;
      unidadeArtigo?: string;
      formulaConversao?: string;
      fatorDesperdicio?: number;
      coeficiente?: number;
      estado?: MappingState;
    }) => {
      const updates: Record<string, any> = {};
      if (artigoBaseId !== undefined) updates.artigo_base_id = artigoBaseId || null;
      if (unidadeArtigo !== undefined) updates.unidade_artigo = unidadeArtigo;
      if (formulaConversao !== undefined) updates.formula_conversao = formulaConversao;
      if (fatorDesperdicio !== undefined) updates.fator_desperdicio = fatorDesperdicio;
      if (coeficiente !== undefined) updates.coeficiente = coeficiente;
      if (estado !== undefined) updates.estado = estado;

      const { data, error } = await supabase
        .from("plan_measurement_mappings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PlanMeasurementMapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-mappings", planImportId] });
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("plan_measurement_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-mappings", planImportId] });
      toast.success("Mapeamento removido");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  return {
    mappings: mappingsQuery.data ?? [],
    isLoading: mappingsQuery.isLoading,
    createMapping,
    updateMapping,
    deleteMapping,
  };
}
