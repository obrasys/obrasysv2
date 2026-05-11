import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  SpecialtyDetectedElement,
  SpecialtyType,
} from "@/types/especialidades";

export function useSpecialtyElements(planId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["specialty-elements", planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("specialty_detected_elements" as any)
        .select("*")
        .eq("specialty_plan_id", planId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SpecialtyDetectedElement[];
    },
    enabled: !!planId && !!user,
  });

  const addElement = useMutation({
    mutationFn: async (input: {
      planId: string;
      specialty_type: SpecialtyType;
      symbol_type: string;
      label?: string;
      unit?: string;
      x?: number;
      y?: number;
      page_number?: number;
      floor_level?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("specialty_detected_elements" as any)
        .insert({
          specialty_plan_id: input.planId,
          user_id: user.id,
          specialty_type: input.specialty_type,
          symbol_type: input.symbol_type,
          label: input.label ?? null,
          unit: input.unit ?? "un",
          quantity: 1,
          x_position: input.x ?? null,
          y_position: input.y ?? null,
          page_number: input.page_number ?? 1,
          floor_level: input.floor_level ?? null,
          source: "manual",
          user_confirmed: true,
          review_required: false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SpecialtyDetectedElement;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialty-elements", planId] });
    },
    onError: (e: Error) => toast.error("Erro ao adicionar símbolo: " + e.message),
  });

  const updateElement = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SpecialtyDetectedElement> }) => {
      const { error } = await supabase
        .from("specialty_detected_elements" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["specialty-elements", planId] }),
  });

  const deleteElement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("specialty_detected_elements" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["specialty-elements", planId] }),
  });

  return {
    elements: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    addElement,
    updateElement,
    deleteElement,
  };
}
