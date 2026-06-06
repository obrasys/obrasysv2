import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanAnalysisLogRow {
  id: string;
  plan_import_id: string | null;
  plan_analysis_version_id: string | null;
  organization_id: string;
  obra_id: string | null;
  user_id: string | null;
  event_type: string;
  status: "info" | "success" | "warning" | "error";
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Fase 9 — Auditoria do pipeline Planta/ICF.
 * Carrega o histórico de eventos (`plan_analysis_logs`) de uma planta
 * específica, ordenado do mais recente para o mais antigo. RLS por
 * organização já garantida na tabela.
 */
export function usePlanAnalysisAudit(planImportId: string | null | undefined) {
  const { organization } = useAuth();
  const orgId = organization?.id ?? null;

  return useQuery({
    queryKey: ["plan-analysis-audit", planImportId, orgId],
    enabled: !!planImportId && !!orgId,
    queryFn: async (): Promise<PlanAnalysisLogRow[]> => {
      const { data, error } = await supabase
        .from("plan_analysis_logs")
        .select(
          "id,plan_import_id,plan_analysis_version_id,organization_id,obra_id,user_id,event_type,status,message,metadata,created_at",
        )
        .eq("plan_import_id", planImportId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PlanAnalysisLogRow[];
    },
    staleTime: 15_000,
  });
}
