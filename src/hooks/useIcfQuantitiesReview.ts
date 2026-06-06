import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { IcfPlantAnalysisResult } from "@/hooks/useIcfPlantAnalysis";
import type { IcfUnifiedQuantities } from "@/lib/icf-unified-quantities";

interface SaveReviewParams {
  result: IcfPlantAnalysisResult;
  quantities: IcfUnifiedQuantities;
  obraId?: string | null;
  notes?: string | null;
}

/**
 * Fase 7 — Persiste a revisão humana dos quantitativos ICF.
 * Atualiza a versão atual de `plan_analysis_versions` com o payload editado +
 * sumário consolidado, marca `human_reviewed=true`/`requires_review=false`
 * e regista o evento em `plan_analysis_logs`.
 */
export function useIcfQuantitiesReview() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ result, quantities, obraId, notes }: SaveReviewParams) => {
      const orgId = organization?.id;
      const planImportId = result.__plan_import_id ?? null;
      const versionId = result.__plan_analysis_version_id ?? null;
      if (!orgId) throw new Error("Organização não encontrada.");
      if (!planImportId || !versionId) {
        throw new Error("Esta análise não tem versão associada para guardar a revisão.");
      }

      const payload = {
        paredes: result.paredes,
        fundacoes: result.fundacoes,
        lajes: result.lajes,
        notas: result.notas ?? null,
        revisao_humana: {
          em: new Date().toISOString(),
          totais: quantities.totais,
          params: quantities.params,
          paredes_revisao: quantities.totais.paredes_revisao,
          paredes_total: quantities.totais.paredes_total,
          origem: quantities.origem,
        },
      };

      const summary = {
        totais: quantities.totais,
        params: quantities.params,
        avisos: quantities.avisos,
        origem: quantities.origem,
      };

      const stillNeedsReview = quantities.totais.paredes_revisao > 0;

      const { error: updErr } = await supabase
        .from("plan_analysis_versions")
        .update({
          analysis_payload: payload as any,
          summary: summary as any,
          human_reviewed: true,
          requires_review: stillNeedsReview,
          notes: notes ?? null,
          confidence: quantities.totais.confianca_media ?? null,
        } as any)
        .eq("id", versionId)
        .eq("organization_id", orgId);
      if (updErr) throw updErr;

      await supabase.from("plan_analysis_logs").insert({
        plan_import_id: planImportId,
        plan_analysis_version_id: versionId,
        organization_id: orgId,
        obra_id: obraId ?? null,
        event_type: "revisao_humana_guardada",
        status: stillNeedsReview ? "warning" : "success",
        message: stillNeedsReview
          ? `Revisão guardada com ${quantities.totais.paredes_revisao} parede(s) ainda por validar.`
          : `Revisão completa: ${quantities.totais.paredes_total} parede(s) validadas.`,
        metadata: {
          totais: quantities.totais,
          origem: quantities.origem,
        },
      } as any);

      return { versionId, stillNeedsReview };
    },
    onSuccess: ({ stillNeedsReview }) => {
      qc.invalidateQueries({ queryKey: ["plan-analysis-versions"] });
      toast({
        title: stillNeedsReview ? "Revisão guardada (parcial)" : "Revisão guardada",
        description: stillNeedsReview
          ? "Ainda há paredes marcadas para rever."
          : "Todos os panos foram validados.",
        variant: stillNeedsReview ? "default" : "default",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Erro a guardar revisão",
        description: e?.message || "Falha desconhecida.",
        variant: "destructive",
      });
    },
  });
}
