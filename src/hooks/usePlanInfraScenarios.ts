import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanInfraScenario, PlanInfraItem } from "@/types/plan-infra";

export function usePlanInfraScenarios(siteConditionId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const qk = ["plan-infra-scenarios", siteConditionId];

  const scenariosQuery = useQuery({
    queryKey: qk,
    queryFn: async () => {
      if (!siteConditionId) return [];
      const { data, error } = await supabase
        .from("plan_infra_scenarios")
        .select("*")
        .eq("site_condition_id", siteConditionId)
        .order("created_at");
      if (error) throw error;
      return data as PlanInfraScenario[];
    },
    enabled: !!siteConditionId && !!user,
  });

  const itemsQuery = useQuery({
    queryKey: ["plan-infra-items", siteConditionId],
    queryFn: async () => {
      if (!siteConditionId) return [];
      const scenarios = scenariosQuery.data;
      if (!scenarios || scenarios.length === 0) return [];
      const ids = scenarios.map((s) => s.id);
      const { data, error } = await supabase
        .from("plan_infra_items")
        .select("*")
        .in("scenario_id", ids)
        .order("created_at");
      if (error) throw error;
      return data as PlanInfraItem[];
    },
    enabled: !!siteConditionId && !!user && (scenariosQuery.data?.length ?? 0) > 0,
  });

  const selectScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      if (!siteConditionId) throw new Error("Sem condições do terreno");
      // Deselect all, then select one
      await supabase
        .from("plan_infra_scenarios")
        .update({ selecionado: false })
        .eq("site_condition_id", siteConditionId);

      const { error } = await supabase
        .from("plan_infra_scenarios")
        .update({ selecionado: true, updated_at: new Date().toISOString() })
        .eq("id", scenarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success("Cenário selecionado");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const deleteScenario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_infra_scenarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      qc.invalidateQueries({ queryKey: ["plan-infra-items", siteConditionId] });
      toast.success("Cenário eliminado");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const insertScenariosWithItems = useMutation({
    mutationFn: async (payload: {
      scenarios: Array<{
        nome: string;
        tipo_fundacao: string;
        descricao: string;
        parametros: Record<string, any>;
        custo_estimado: number;
        axia_confidence: number;
        axia_reasoning: string;
        items: Array<{
          descricao: string;
          unidade: string;
          quantidade: number;
          preco_unitario: number;
          valor_total: number;
          formula_origem: string;
        }>;
      }>;
    }) => {
      if (!user || !siteConditionId) throw new Error("Não autenticado");

      // Delete old scenarios first
      await supabase
        .from("plan_infra_scenarios")
        .delete()
        .eq("site_condition_id", siteConditionId);

      for (const sc of payload.scenarios) {
        const { data: inserted, error } = await supabase
          .from("plan_infra_scenarios")
          .insert({
            site_condition_id: siteConditionId,
            user_id: user.id,
            nome: sc.nome,
            tipo_fundacao: sc.tipo_fundacao,
            descricao: sc.descricao,
            parametros: sc.parametros as any,
            custo_estimado: sc.custo_estimado,
            axia_confidence: sc.axia_confidence,
            axia_reasoning: sc.axia_reasoning,
          })
          .select()
          .single();
        if (error) throw error;

        if (sc.items.length > 0) {
          const itemRows = sc.items.map((it) => ({
            scenario_id: inserted.id,
            descricao: it.descricao,
            unidade: it.unidade,
            quantidade: it.quantidade,
            preco_unitario: it.preco_unitario,
            valor_total: it.valor_total,
            formula_origem: it.formula_origem,
          }));
          const { error: itemErr } = await supabase.from("plan_infra_items").insert(itemRows);
          if (itemErr) throw itemErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      qc.invalidateQueries({ queryKey: ["plan-infra-items", siteConditionId] });
      toast.success("Cenários de infraestrutura gerados");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  return {
    scenarios: scenariosQuery.data ?? [],
    items: itemsQuery.data ?? [],
    isLoading: scenariosQuery.isLoading,
    selectScenario,
    deleteScenario,
    insertScenariosWithItems,
  };
}
