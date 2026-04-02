import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanOpening, TipoVao, OrigemDado } from "@/types/plan-measurements";

export function usePlanOpenings(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all openings for walls on this plan
  const openingsQuery = useQuery({
    queryKey: ["plan-openings", planImportId],
    queryFn: async () => {
      if (!planImportId) return [];
      // Get wall IDs for this plan first
      const { data: walls } = await supabase
        .from("plan_walls")
        .select("id")
        .eq("plan_import_id", planImportId);
      if (!walls || walls.length === 0) return [];
      const wallIds = walls.map((w) => w.id);
      const { data, error } = await supabase
        .from("plan_openings")
        .select("*")
        .in("wall_id", wallIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PlanOpening[];
    },
    enabled: !!planImportId && !!user,
  });

  const addOpening = useMutation({
    mutationFn: async (input: {
      wall_id: string;
      tipo?: TipoVao;
      largura_m: number;
      altura_m: number;
      peitoril_m?: number;
      posicao_na_parede?: { x: number; y: number };
      observacao?: string;
      origem?: OrigemDado;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("plan_openings")
        .insert({
          wall_id: input.wall_id,
          user_id: user.id,
          tipo: input.tipo || "porta",
          largura_m: input.largura_m,
          altura_m: input.altura_m,
          peitoril_m: input.peitoril_m ?? null,
          posicao_na_parede: input.posicao_na_parede ? (input.posicao_na_parede as any) : null,
          observacao: input.observacao || null,
          origem: input.origem || "manual",
        })
        .select()
        .single();
      if (error) throw error;
      return data as PlanOpening;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-openings", planImportId] });
      toast.success("Vão criado");
    },
    onError: (err: Error) => toast.error("Erro ao criar vão: " + err.message),
  });

  const updateOpening = useMutation({
    mutationFn: async (input: {
      id: string;
      tipo?: TipoVao;
      largura_m?: number;
      altura_m?: number;
      peitoril_m?: number | null;
      observacao?: string;
    }) => {
      const updates: Record<string, any> = {};
      if (input.tipo !== undefined) updates.tipo = input.tipo;
      if (input.largura_m !== undefined) updates.largura_m = input.largura_m;
      if (input.altura_m !== undefined) updates.altura_m = input.altura_m;
      if (input.peitoril_m !== undefined) updates.peitoril_m = input.peitoril_m;
      if (input.observacao !== undefined) updates.observacao = input.observacao;

      const { data, error } = await supabase
        .from("plan_openings")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as PlanOpening;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-openings", planImportId] });
    },
    onError: (err: Error) => toast.error("Erro ao atualizar vão: " + err.message),
  });

  const deleteOpening = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_openings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-openings", planImportId] });
      toast.success("Vão eliminado");
    },
    onError: (err: Error) => toast.error("Erro ao eliminar: " + err.message),
  });

  return {
    openings: openingsQuery.data ?? [],
    isLoading: openingsQuery.isLoading,
    addOpening,
    updateOpening,
    deleteOpening,
  };
}
