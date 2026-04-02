import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanWall, TipoFuncionalParede, MaterialParede, OrigemDado } from "@/types/plan-measurements";

export function usePlanWalls(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const wallsQuery = useQuery({
    queryKey: ["plan-walls", planImportId],
    queryFn: async () => {
      if (!planImportId) return [];
      const { data, error } = await supabase
        .from("plan_walls")
        .select("*")
        .eq("plan_import_id", planImportId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PlanWall[];
    },
    enabled: !!planImportId && !!user,
  });

  const addWall = useMutation({
    mutationFn: async (input: {
      start_point: { x: number; y: number };
      end_point: { x: number; y: number };
      comprimento_m: number;
      espessura_cm?: number;
      tipo_funcional?: TipoFuncionalParede;
      material?: MaterialParede;
      room_id?: string;
      observacao?: string;
      origem?: OrigemDado;
    }) => {
      if (!user || !planImportId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("plan_walls")
        .insert({
          plan_import_id: planImportId,
          user_id: user.id,
          start_point: input.start_point as any,
          end_point: input.end_point as any,
          comprimento_m: input.comprimento_m,
          espessura_cm: input.espessura_cm ?? 15,
          tipo_funcional: input.tipo_funcional || "interior_divisoria",
          material: input.material || "alvenaria",
          room_id: input.room_id || null,
          observacao: input.observacao || null,
          origem: input.origem || "manual",
        })
        .select()
        .single();
      if (error) throw error;
      return data as PlanWall;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-walls", planImportId] });
      toast.success("Parede criada");
    },
    onError: (err: Error) => toast.error("Erro ao criar parede: " + err.message),
  });

  const updateWall = useMutation({
    mutationFn: async (input: {
      id: string;
      espessura_cm?: number;
      tipo_funcional?: TipoFuncionalParede;
      material?: MaterialParede;
      room_id?: string | null;
      observacao?: string;
    }) => {
      const updates: Record<string, any> = {};
      if (input.espessura_cm !== undefined) updates.espessura_cm = input.espessura_cm;
      if (input.tipo_funcional !== undefined) updates.tipo_funcional = input.tipo_funcional;
      if (input.material !== undefined) updates.material = input.material;
      if (input.room_id !== undefined) updates.room_id = input.room_id;
      if (input.observacao !== undefined) updates.observacao = input.observacao;

      const { data, error } = await supabase
        .from("plan_walls")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as PlanWall;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-walls", planImportId] });
    },
    onError: (err: Error) => toast.error("Erro ao atualizar parede: " + err.message),
  });

  const deleteWall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_walls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-walls", planImportId] });
      toast.success("Parede eliminada");
    },
    onError: (err: Error) => toast.error("Erro ao eliminar: " + err.message),
  });

  return {
    walls: wallsQuery.data ?? [],
    isLoading: wallsQuery.isLoading,
    addWall,
    updateWall,
    deleteWall,
  };
}
