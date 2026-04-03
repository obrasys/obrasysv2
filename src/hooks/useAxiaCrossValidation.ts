import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanMeasurement, PlanMeasurementMapping } from "@/types/plan-measurements";

export interface CrossValidationAlert {
  id: string;
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
  metric: string;
  plan_value: number;
  reference_value: number;
  deviation_percent: number;
  dismissed?: boolean;
}

export function useAxiaCrossValidation() {
  const { session } = useAuth();
  const [alerts, setAlerts] = useState<CrossValidationAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    async ({
      obraId,
      measurements,
      mappings,
      rooms,
    }: {
      obraId: string;
      measurements: PlanMeasurement[];
      mappings: PlanMeasurementMapping[];
      rooms: Array<{ nome: string; area_m2: number; perimetro_m: number; tipo_compartimento: string }>;
    }) => {
      if (!session?.access_token || measurements.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch historical budgets for comparison
        const { data: historicalBudgets } = await supabase
          .from("orcamentos")
          .select("id, nome, valor_total, tipo_obra, area_total_m2")
          .not("valor_total", "is", null)
          .not("area_total_m2", "is", null)
          .gt("area_total_m2", 0)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!historicalBudgets || historicalBudgets.length < 2) {
          setAlerts([]);
          setError("Dados históricos insuficientes para validação cruzada (mínimo 2 orçamentos).");
          return;
        }

        // Calculate current plan metrics
        const totalAreaRooms = rooms.reduce((s, r) => s + (r.area_m2 || 0), 0);
        const totalLineMeasurements = measurements
          .filter((m) => m.tipo === "linha")
          .reduce((s, m) => s + (m.valor_final || m.valor_bruto), 0);
        const totalAreaMeasurements = measurements
          .filter((m) => m.tipo === "area")
          .reduce((s, m) => s + (m.valor_final || m.valor_bruto), 0);
        const mappedCount = mappings.filter((m) => m.estado === "mapeado").length;
        const mappingRatio = measurements.length > 0 ? mappedCount / measurements.length : 0;

        // Calculate historical stats
        const historicalPricePerM2 = historicalBudgets
          .map((b: any) => (b.valor_total || 0) / (b.area_total_m2 || 1))
          .sort((a: number, b: number) => a - b);

        const medianIdx = Math.floor(historicalPricePerM2.length / 2);
        const medianPricePerM2 = historicalPricePerM2[medianIdx] || 0;
        const p25 = historicalPricePerM2[Math.floor(historicalPricePerM2.length * 0.25)] || 0;
        const p75 = historicalPricePerM2[Math.floor(historicalPricePerM2.length * 0.75)] || 0;

        const newAlerts: CrossValidationAlert[] = [];

        // Alert 1: Low mapping ratio
        if (mappingRatio < 0.5 && measurements.length >= 3) {
          newAlerts.push({
            id: `cv-mapping-${Date.now()}`,
            severity: "warning",
            title: "Mapeamento incompleto",
            message: `Apenas ${Math.round(mappingRatio * 100)}% das medições estão mapeadas a artigos. Recomenda-se mapear pelo menos 80%.`,
            metric: "mapping_ratio",
            plan_value: mappingRatio * 100,
            reference_value: 80,
            deviation_percent: -((80 - mappingRatio * 100) / 80) * 100,
          });
        }

        // Alert 2: Room area vs measurement area mismatch
        if (totalAreaRooms > 0 && totalAreaMeasurements > 0) {
          const areaDeviation = ((totalAreaMeasurements - totalAreaRooms) / totalAreaRooms) * 100;
          if (Math.abs(areaDeviation) > 25) {
            newAlerts.push({
              id: `cv-area-${Date.now()}`,
              severity: Math.abs(areaDeviation) > 50 ? "error" : "warning",
              title: "Desvio de área significativo",
              message: `A soma das medições de área (${totalAreaMeasurements.toFixed(1)} m²) desvia ${Math.abs(areaDeviation).toFixed(0)}% da área total dos compartimentos (${totalAreaRooms.toFixed(1)} m²).`,
              metric: "area_deviation",
              plan_value: totalAreaMeasurements,
              reference_value: totalAreaRooms,
              deviation_percent: areaDeviation,
            });
          }
        }

        // Alert 3: Rooms without measurements
        const roomCount = rooms.length;
        if (roomCount > 0 && measurements.length > 0) {
          const avgMeasurementsPerRoom = measurements.length / roomCount;
          if (avgMeasurementsPerRoom < 2) {
            newAlerts.push({
              id: `cv-sparse-${Date.now()}`,
              severity: "info",
              title: "Poucos quantitativos por compartimento",
              message: `Média de ${avgMeasurementsPerRoom.toFixed(1)} medições por compartimento. Verifique se faltam medições de pavimento, paredes ou teto.`,
              metric: "measurements_per_room",
              plan_value: avgMeasurementsPerRoom,
              reference_value: 5,
              deviation_percent: -((5 - avgMeasurementsPerRoom) / 5) * 100,
            });
          }
        }

        // Alert 4: Historical price/m² comparison (if we have enough data)
        if (totalAreaRooms > 0 && medianPricePerM2 > 0) {
          newAlerts.push({
            id: `cv-benchmark-${Date.now()}`,
            severity: "info",
            title: "Referência histórica",
            message: `Orçamentos anteriores: mediana ${medianPricePerM2.toFixed(0)} €/m² (P25: ${p25.toFixed(0)}, P75: ${p75.toFixed(0)}). Área atual: ${totalAreaRooms.toFixed(1)} m² → estimativa ${(totalAreaRooms * medianPricePerM2).toFixed(0)} €.`,
            metric: "price_per_m2_benchmark",
            plan_value: totalAreaRooms,
            reference_value: medianPricePerM2,
            deviation_percent: 0,
          });
        }

        setAlerts(newAlerts);
      } catch (err: any) {
        console.error("Cross-validation error:", err);
        setError(err.message || "Erro na validação cruzada");
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
  }, []);

  return { alerts, loading, error, validate, dismissAlert };
}
