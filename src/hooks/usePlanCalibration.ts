import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanCalibration } from "@/types/plan-measurements";

const NULL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Calibração por planta + página + pavimento.
 * Quando pageId/floorId não são fornecidos, opera no escopo "global" (compatibilidade).
 *
 * Após Fase 2 (multi-página): usar sempre pageId quando disponível.
 */
export function usePlanCalibration(
  planImportId?: string,
  pageId?: string | null,
  floorId?: string | null,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const scopeKey = ["plan-calibration", planImportId, pageId ?? null, floorId ?? null];

  const calibrationQuery = useQuery({
    queryKey: scopeKey,
    queryFn: async () => {
      if (!planImportId) return null;
      let q = supabase
        .from("plan_calibrations")
        .select("*")
        .eq("plan_import_id", planImportId);

      if (pageId) q = q.eq("page_id", pageId);
      else q = q.is("page_id", null);

      if (floorId) q = (q as any).eq("floor_id", floorId);
      else q = (q as any).is("floor_id", null);

      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PlanCalibration | null;
    },
    enabled: !!planImportId && !!user,
  });

  const saveCalibration = useMutation({
    mutationFn: async ({
      point1,
      point2,
      realDistance,
      unidade,
    }: {
      point1: { x: number; y: number };
      point2: { x: number; y: number };
      realDistance: number;
      unidade: string;
    }) => {
      if (!user || !planImportId) throw new Error("Não autenticado");

      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);

      const distanceInMeters = unidade === "cm" ? realDistance / 100 : realDistance;
      const pixelsPerMeter = pixelDistance / distanceInMeters;

      // Sanity check (non-blocking, surfaced via toast)
      if (pixelsPerMeter < 5 || pixelsPerMeter > 5000) {
        toast.warning(
          `Escala invulgar (${pixelsPerMeter.toFixed(0)} px/m). Verifique se selecionou os pontos corretos.`,
        );
      }

      // Apaga calibração existente APENAS deste escopo (página/pavimento) — não toca outras páginas
      let del = supabase
        .from("plan_calibrations")
        .delete()
        .eq("plan_import_id", planImportId);
      if (pageId) del = del.eq("page_id", pageId);
      else del = del.is("page_id", null);
      if (floorId) del = (del as any).eq("floor_id", floorId);
      else del = (del as any).is("floor_id", null);
      await del;

      const { data, error } = await supabase
        .from("plan_calibrations")
        .insert({
          plan_import_id: planImportId,
          page_id: pageId ?? null,
          floor_id: floorId ?? null,
          user_id: user.id,
          point1,
          point2,
          real_distance: realDistance,
          pixels_per_meter: pixelsPerMeter,
          unidade,
          status: "valida",
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Marca a planta como calibrada (se ainda não estiver)
      await supabase
        .from("plan_imports")
        .update({ status: "calibrada" })
        .eq("id", planImportId);

      return data as unknown as PlanCalibration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-calibration", planImportId] });
      queryClient.invalidateQueries({ queryKey: ["plan-imports"] });
      toast.success("Escala calibrada com sucesso");
    },
    onError: (err: Error) => {
      toast.error("Erro ao calibrar: " + err.message);
    },
  });

  return {
    calibration: calibrationQuery.data ?? null,
    isLoading: calibrationQuery.isLoading,
    saveCalibration,
  };
}
