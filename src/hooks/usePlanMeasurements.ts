import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanMeasurement, MeasurementType, ValidationState } from "@/types/plan-measurements";

export function usePlanMeasurements(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const measurementsQuery = useQuery({
    queryKey: ["plan-measurements", planImportId],
    queryFn: async () => {
      if (!planImportId) return [];
      const { data, error } = await supabase
        .from("plan_measurements")
        .select("*")
        .eq("plan_import_id", planImportId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PlanMeasurement[];
    },
    enabled: !!planImportId && !!user,
  });

  const addMeasurement = useMutation({
    mutationFn: async ({
      tipo,
      coordinates,
      valorBruto,
      unidade,
      camada,
      etiqueta,
      cor,
      observacao,
    }: {
      tipo: MeasurementType;
      coordinates: Array<{ x: number; y: number }>;
      valorBruto: number;
      unidade: string;
      camada?: string;
      etiqueta?: string;
      cor?: string;
      observacao?: string;
    }) => {
      if (!user || !planImportId) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("plan_measurements")
        .insert({
          plan_import_id: planImportId,
          user_id: user.id,
          tipo,
          coordinates: coordinates as any,
          valor_bruto: valorBruto,
          valor_ajustado: valorBruto,
          valor_final: valorBruto,
          unidade,
          camada: camada || null,
          etiqueta: etiqueta || null,
          cor: cor || "#3b82f6",
          observacao: observacao || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Update plan status
      await supabase
        .from("plan_imports")
        .update({ status: "medida" })
        .eq("id", planImportId);

      return data as PlanMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-measurements", planImportId] });
      queryClient.invalidateQueries({ queryKey: ["plan-imports"] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao guardar medição: " + err.message);
    },
  });

  const updateMeasurement = useMutation({
    mutationFn: async ({
      id,
      valorAjustado,
      valorFinal,
      etiqueta,
      camada,
      observacao,
      estadoValidacao,
    }: {
      id: string;
      valorAjustado?: number;
      valorFinal?: number;
      etiqueta?: string;
      camada?: string;
      observacao?: string;
      estadoValidacao?: ValidationState;
    }) => {
      const updates: Record<string, any> = {};
      if (valorAjustado !== undefined) updates.valor_ajustado = valorAjustado;
      if (valorFinal !== undefined) updates.valor_final = valorFinal;
      if (etiqueta !== undefined) updates.etiqueta = etiqueta;
      if (camada !== undefined) updates.camada = camada;
      if (observacao !== undefined) updates.observacao = observacao;
      if (estadoValidacao !== undefined) updates.estado_validacao = estadoValidacao;

      const { data, error } = await supabase
        .from("plan_measurements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PlanMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-measurements", planImportId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar: " + err.message);
    },
  });

  const deleteMeasurement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("plan_measurements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-measurements", planImportId] });
      toast.success("Medição eliminada");
    },
    onError: (err: Error) => {
      toast.error("Erro ao eliminar: " + err.message);
    },
  });

  return {
    measurements: measurementsQuery.data ?? [],
    isLoading: measurementsQuery.isLoading,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
  };
}

/** Calculate total line length in meters from coordinates and pixelsPerMeter */
export function calculateLineLength(
  coordinates: Array<{ x: number; y: number }>,
  pixelsPerMeter: number
): number {
  if (coordinates.length < 2 || pixelsPerMeter <= 0) return 0;
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const dx = coordinates[i].x - coordinates[i - 1].x;
    const dy = coordinates[i].y - coordinates[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total / pixelsPerMeter;
}

/** Calculate polygon area in m² from coordinates using Shoelace formula */
export function calculatePolygonArea(
  coordinates: Array<{ x: number; y: number }>,
  pixelsPerMeter: number
): number {
  if (coordinates.length < 3 || pixelsPerMeter <= 0) return 0;
  let area = 0;
  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i].x * coordinates[j].y;
    area -= coordinates[j].x * coordinates[i].y;
  }
  return Math.abs(area) / 2 / (pixelsPerMeter * pixelsPerMeter);
}
