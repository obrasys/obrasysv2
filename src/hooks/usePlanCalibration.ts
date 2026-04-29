import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanCalibration } from "@/types/plan-measurements";

export function usePlanCalibration(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const calibrationQuery = useQuery({
    queryKey: ["plan-calibration", planImportId],
    queryFn: async () => {
      if (!planImportId) return null;
      const { data, error } = await supabase
        .from("plan_calibrations")
        .select("*")
        .eq("plan_import_id", planImportId)
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

      // Upsert: delete existing and insert new
      await supabase
        .from("plan_calibrations")
        .delete()
        .eq("plan_import_id", planImportId);

      const { data, error } = await supabase
        .from("plan_calibrations")
        .insert({
          plan_import_id: planImportId,
          user_id: user.id,
          point1,
          point2,
          real_distance: realDistance,
          pixels_per_meter: pixelsPerMeter,
          unidade,
          status: "valida",
        })
        .select()
        .single();
      if (error) throw error;

      // Update plan status to calibrada
      await supabase
        .from("plan_imports")
        .update({ status: "calibrada" })
        .eq("id", planImportId);

      return data as PlanCalibration;
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
