import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PlanFloorType =
  | "subsolo"
  | "terreo"
  | "intermedio"
  | "cobertura"
  | "tecnico"
  | "exterior"
  | "outro";

export interface PlanFloor {
  id: string;
  obra_id: string;
  user_id: string;
  name: string;
  type: PlanFloorType;
  order_index: number;
  default_ceiling_height: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddFloorInput {
  name: string;
  type?: PlanFloorType;
  order_index?: number;
  default_ceiling_height?: number;
  notes?: string;
}

export function usePlanFloors(obraId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const floorsQuery = useQuery({
    queryKey: ["plan-floors", obraId],
    queryFn: async () => {
      if (!obraId) return [] as PlanFloor[];
      const { data, error } = await supabase
        .from("plan_floors")
        .select("*")
        .eq("obra_id", obraId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PlanFloor[];
    },
    enabled: !!obraId && !!user,
  });

  const addFloor = useMutation({
    mutationFn: async (input: AddFloorInput) => {
      if (!user || !obraId) throw new Error("Não autenticado");
      const nextIndex =
        input.order_index ??
        (floorsQuery.data?.length
          ? Math.max(...floorsQuery.data.map((f) => f.order_index)) + 1
          : 0);
      const { data, error } = await supabase
        .from("plan_floors")
        .insert({
          obra_id: obraId,
          user_id: user.id,
          name: input.name,
          type: input.type ?? "terreo",
          order_index: nextIndex,
          default_ceiling_height: input.default_ceiling_height ?? 2.7,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PlanFloor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-floors", obraId] });
      toast.success("Pavimento criado");
    },
    onError: (err: Error) => toast.error("Erro ao criar pavimento: " + err.message),
  });

  const updateFloor = useMutation({
    mutationFn: async (input: Partial<PlanFloor> & { id: string }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("plan_floors")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PlanFloor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-floors", obraId] });
    },
    onError: (err: Error) => toast.error("Erro ao atualizar pavimento: " + err.message),
  });

  const deleteFloor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_floors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-floors", obraId] });
      toast.success("Pavimento eliminado");
    },
    onError: (err: Error) => toast.error("Erro ao eliminar pavimento: " + err.message),
  });

  return {
    floors: floorsQuery.data ?? [],
    isLoading: floorsQuery.isLoading,
    addFloor,
    updateFloor,
    deleteFloor,
  };
}
