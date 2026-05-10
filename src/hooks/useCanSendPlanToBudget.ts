import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CanSendResult {
  ok: boolean;
  loading: boolean;       // qualquer query subjacente ainda em execução
  reasons: string[];      // bloqueios duros
  warnings: string[];     // requerem confirmação
  requiresExplicitConfirmation: boolean;
  meta: {
    hasCalibration: boolean;
    pendingMeasurements: number;
    lowConfidenceMeasurements: number;
    axiaHighRiskUnreviewed: boolean;
    axiaReviewRequired: boolean;
    hasAnyData: boolean;
  };
}

/**
 * Avalia se é seguro enviar quantitativos da Planta para o Orçamento.
 *
 * Regras (Fase 3 da auditoria):
 *  - Sem calibração válida no escopo (página/pavimento) → bloqueio duro.
 *  - Risco Axia "alto" sem revisão → bloqueio duro.
 *  - Sem qualquer dado (nem medições nem análise) → bloqueio duro.
 *  - Medições pendentes / baixa confiança / fallback estimado → warnings (requer confirmação explícita).
 */
export function useCanSendPlanToBudget(
  planImportId?: string | null,
  pageId?: string | null,
  floorId?: string | null,
): CanSendResult {
  const { user } = useAuth();

  const calibrationQuery = useQuery({
    queryKey: ["can-send-calibration", planImportId, pageId, floorId],
    queryFn: async () => {
      if (!planImportId) return null;
      let q = supabase.from("plan_calibrations")
        .select("id,pixels_per_meter,status,page_id,floor_id" as any)
        .eq("plan_import_id", planImportId)
        .eq("status", "valida");
      if (pageId) q = q.eq("page_id", pageId);
      else q = q.is("page_id", null);
      if (floorId) q = (q as any).eq("floor_id", floorId);
      else q = (q as any).is("floor_id", null);
      const { data } = await q.limit(1);
      return (data?.[0] ?? null) as any;
    },
    enabled: !!planImportId && !!user,
  });

  const measurementsQuery = useQuery({
    queryKey: ["can-send-measurements", planImportId],
    queryFn: async () => {
      if (!planImportId) return [];
      const { data } = await supabase
        .from("plan_measurements")
        .select("id,estado_validacao,confidence,axia_status" as any)
        .eq("plan_import_id", planImportId);
      return (data as any[]) ?? [];
    },
    enabled: !!planImportId && !!user,
  });

  const pageQuery = useQuery({
    queryKey: ["can-send-page-axia", planImportId, pageId],
    queryFn: async () => {
      if (!planImportId) return null;
      let q = supabase.from("plan_pages")
        .select("id,axia_analysis,axia_risk_level,axia_review_required" as any)
        .eq("plan_import_id", planImportId);
      if (pageId) q = q.eq("id", pageId);
      const { data } = await q.limit(50);
      return (data as any[]) ?? [];
    },
    enabled: !!planImportId && !!user,
  });

  return useMemo<CanSendResult>(() => {
    const reasons: string[] = [];
    const warnings: string[] = [];

    const hasCalibration = !!calibrationQuery.data;
    const measurements = measurementsQuery.data ?? [];
    const pages = pageQuery.data ?? [];

    const pendingMeasurements = measurements.filter(
      (m: any) => m?.estado_validacao === "pendente",
    ).length;
    const lowConfidenceMeasurements = measurements.filter(
      (m: any) => m?.confidence === "incerto",
    ).length;

    const axiaHighRiskUnreviewed = pages.some(
      (p: any) => p?.axia_risk_level === "alto" && p?.axia_review_required === true,
    );
    const axiaReviewRequired = pages.some(
      (p: any) => p?.axia_review_required === true,
    );
    const hasAxia = pages.some((p: any) => !!p?.axia_analysis);
    const hasAnyData = hasAxia || measurements.length > 0;

    if (!hasCalibration) {
      reasons.push("A página atual ainda não tem calibração de escala válida.");
    }
    if (!hasAnyData) {
      reasons.push("Não existem medições nem análise Axia para enviar.");
    }
    if (axiaHighRiskUnreviewed) {
      reasons.push("Existe análise Axia com risco alto que precisa de revisão antes de enviar.");
    }

    if (pendingMeasurements > 0) {
      warnings.push(`${pendingMeasurements} medição(ões) pendente(s) de validação.`);
    }
    if (lowConfidenceMeasurements > 0) {
      warnings.push(`${lowConfidenceMeasurements} medição(ões) com confiança baixa.`);
    }
    if (axiaReviewRequired && !axiaHighRiskUnreviewed) {
      warnings.push("Há resultados Axia marcados para revisão humana.");
    }

    return {
      ok: reasons.length === 0,
      reasons,
      warnings,
      requiresExplicitConfirmation: warnings.length > 0,
      meta: {
        hasCalibration,
        pendingMeasurements,
        lowConfidenceMeasurements,
        axiaHighRiskUnreviewed,
        axiaReviewRequired,
        hasAnyData,
      },
    };
  }, [calibrationQuery.data, measurementsQuery.data, pageQuery.data]);
}
