import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanSiteCondition, TipoSolo, ZonaSismica, Topografia } from "@/types/plan-infra";

export function usePlanSiteConditions(obraId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const qk = ["plan-site-conditions", obraId];

  const query = useQuery({
    queryKey: qk,
    queryFn: async () => {
      if (!obraId) return null;
      const { data, error } = await supabase
        .from("plan_site_conditions")
        .select("*")
        .eq("obra_id", obraId)
        .maybeSingle();
      if (error) throw error;
      return (data as PlanSiteCondition) ?? null;
    },
    enabled: !!obraId && !!user,
  });

  const upsert = useMutation({
    mutationFn: async (input: {
      tipo_solo?: TipoSolo;
      capacidade_portante_kpa?: number;
      nivel_freatico_m?: number;
      zona_sismica?: ZonaSismica;
      topografia?: Topografia;
      area_implantacao_m2?: number;
      numero_pisos?: number;
      observacoes?: string;
    }) => {
      if (!user || !obraId) throw new Error("Não autenticado");

      const existing = query.data;
      if (existing) {
        const { data, error } = await supabase
          .from("plan_site_conditions")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as PlanSiteCondition;
      } else {
        const { data, error } = await supabase
          .from("plan_site_conditions")
          .insert({
            obra_id: obraId,
            user_id: user.id,
            ...input,
          })
          .select()
          .single();
        if (error) throw error;
        return data as PlanSiteCondition;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success("Condições do terreno guardadas");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  return {
    siteCondition: query.data ?? null,
    isLoading: query.isLoading,
    upsert,
  };
}
