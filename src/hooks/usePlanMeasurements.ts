import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  PlanMeasurement,
  MeasurementType,
  ValidationState,
  SegmentActionType,
  BudgetLinkStatus,
  AxiaStatus,
  AxiaNote,
} from "@/types/plan-measurements";

export interface AddMeasurementInput {
  tipo: MeasurementType;
  coordinates: Array<{ x: number; y: number }>;
  valorBruto: number;
  unidade: string;
  camada?: string;
  etiqueta?: string;
  cor?: string;
  observacao?: string;
  // Structured intervention metadata
  action_type?: SegmentActionType;
  segment_length?: number;
  ceiling_height?: number;
  wall_area?: number;
  baseboard_length?: number;
  wall_thickness_cm?: number;
  demolition_volume?: number;
  openings_area?: number;
  material_id?: string | null;
  material_label?: string | null;
}

export interface UpdateMeasurementInput {
  id: string;
  valorAjustado?: number;
  valorFinal?: number;
  etiqueta?: string;
  camada?: string;
  observacao?: string;
  estadoValidacao?: ValidationState;
  action_type?: SegmentActionType | null;
  segment_length?: number | null;
  ceiling_height?: number | null;
  wall_area?: number | null;
  baseboard_length?: number | null;
  wall_thickness_cm?: number | null;
  demolition_volume?: number | null;
  openings_area?: number | null;
  material_id?: string | null;
  material_label?: string | null;
  budget_link_status?: BudgetLinkStatus;
  budget_artigo_id?: string | null;
  axia_status?: AxiaStatus;
  axia_notes?: AxiaNote[] | null;
}

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
      return (data ?? []) as unknown as PlanMeasurement[];
    },
    enabled: !!planImportId && !!user,
  });

  const addMeasurement = useMutation({
    mutationFn: async (input: AddMeasurementInput) => {
      if (!user || !planImportId) throw new Error("Não autenticado");
      const payload: Record<string, any> = {
        plan_import_id: planImportId,
        user_id: user.id,
        tipo: input.tipo,
        coordinates: input.coordinates as any,
        valor_bruto: input.valorBruto,
        valor_ajustado: input.valorBruto,
        valor_final: input.valorBruto,
        unidade: input.unidade,
        camada: input.camada || null,
        etiqueta: input.etiqueta || null,
        cor: input.cor || "#3b82f6",
        observacao: input.observacao || null,
      };
      const optional: Array<keyof AddMeasurementInput> = [
        "action_type", "segment_length", "ceiling_height", "wall_area",
        "baseboard_length", "wall_thickness_cm", "demolition_volume",
        "openings_area", "material_id", "material_label",
      ];
      for (const k of optional) {
        if (input[k] !== undefined) payload[k as string] = input[k];
      }

      const { data, error } = await supabase
        .from("plan_measurements")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("plan_imports")
        .update({ status: "medida" })
        .eq("id", planImportId);

      return data as unknown as PlanMeasurement;
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
    mutationFn: async (input: UpdateMeasurementInput) => {
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      if (rest.valorAjustado !== undefined) updates.valor_ajustado = rest.valorAjustado;
      if (rest.valorFinal !== undefined) updates.valor_final = rest.valorFinal;
      if (rest.etiqueta !== undefined) updates.etiqueta = rest.etiqueta;
      if (rest.camada !== undefined) updates.camada = rest.camada;
      if (rest.observacao !== undefined) updates.observacao = rest.observacao;
      if (rest.estadoValidacao !== undefined) updates.estado_validacao = rest.estadoValidacao;
      const passthrough: Array<keyof UpdateMeasurementInput> = [
        "action_type", "segment_length", "ceiling_height", "wall_area",
        "baseboard_length", "wall_thickness_cm", "demolition_volume",
        "openings_area", "material_id", "material_label",
        "budget_link_status", "budget_artigo_id", "axia_status", "axia_notes",
      ];
      for (const k of passthrough) {
        if (rest[k] !== undefined) updates[k as string] = rest[k] as any;
      }

      const { data, error } = await supabase
        .from("plan_measurements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PlanMeasurement;
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

  // Bulk validation update — single PATCH for many ids at once.
  const bulkUpdateValidation = useMutation({
    mutationFn: async ({
      ids,
      estado,
    }: {
      ids: string[];
      estado: ValidationState;
    }) => {
      if (!ids.length) return { count: 0 };
      const { data, error } = await supabase
        .from("plan_measurements")
        .update({ estado_validacao: estado })
        .in("id", ids)
        .select("id");
      if (error) throw error;
      return { count: data?.length ?? 0 };
    },
    onSuccess: ({ count }, { estado }) => {
      queryClient.invalidateQueries({ queryKey: ["plan-measurements", planImportId] });
      toast.success(`${count} medição(ões) atualizada(s) para "${estado}"`);
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar em massa: " + err.message);
    },
  });

  return {
    measurements: measurementsQuery.data ?? [],
    isLoading: measurementsQuery.isLoading,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    bulkUpdateValidation,
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

/** Calculate closed polygon perimeter (a.k.a. Rodapé) in meters — sums all edges including closing edge */
export function calculatePolygonPerimeter(
  coordinates: Array<{ x: number; y: number }>,
  pixelsPerMeter: number
): number {
  if (coordinates.length < 3 || pixelsPerMeter <= 0) return 0;
  let total = 0;
  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = coordinates[j].x - coordinates[i].x;
    const dy = coordinates[j].y - coordinates[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total / pixelsPerMeter;
}

/** Alias: Rodapé is the perimeter of a closed polygon */
export const calculateRodape = calculatePolygonPerimeter;
