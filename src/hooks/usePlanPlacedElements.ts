import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlacedPlantElement } from "@/types/plan-symbols";

export function usePlanPlacedElements(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["plan-placed-elements", planImportId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<PlacedPlantElement[]> => {
      if (!planImportId) return [];
      const { data, error } = await supabase
        .from("plan_placed_elements")
        .select("*")
        .eq("plan_import_id", planImportId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        symbolTypeId: row.symbol_type_id,
        category: row.category,
        subcategory: row.subcategory ?? undefined,
        x: row.x,
        y: row.y,
        rotation: row.rotation ?? undefined,
        scale: row.scale ?? undefined,
        quantity: row.quantity ?? undefined,
        note: row.note ?? undefined,
        environment: row.environment ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    enabled: !!planImportId && !!user,
  });

  const addElement = useMutation({
    mutationFn: async (el: Omit<PlacedPlantElement, "createdAt" | "updatedAt">) => {
      if (!user || !planImportId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("plan_placed_elements")
        .insert({
          id: el.id,
          plan_import_id: planImportId,
          user_id: user.id,
          symbol_type_id: el.symbolTypeId,
          category: el.category,
          subcategory: el.subcategory ?? null,
          x: el.x,
          y: el.y,
          rotation: el.rotation ?? 0,
          scale: el.scale ?? 1,
          quantity: el.quantity ?? 1,
          note: el.note ?? null,
          environment: el.environment ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateElement = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<PlacedPlantElement>) => {
      const payload: Record<string, any> = {};
      if (updates.note !== undefined) payload.note = updates.note;
      if (updates.environment !== undefined) payload.environment = updates.environment;
      if (updates.quantity !== undefined) payload.quantity = updates.quantity;
      if (updates.rotation !== undefined) payload.rotation = updates.rotation;
      if (updates.scale !== undefined) payload.scale = updates.scale;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("plan_placed_elements")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteElement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("plan_placed_elements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Elemento removido");
    },
  });

  const deleteLastElement = useMutation({
    mutationFn: async () => {
      const elements = query.data ?? [];
      if (elements.length === 0) return;
      const last = elements[elements.length - 1];
      const { error } = await supabase
        .from("plan_placed_elements")
        .delete()
        .eq("id", last.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    elements: query.data ?? [],
    isLoading: query.isLoading,
    addElement,
    updateElement,
    deleteElement,
    deleteLastElement,
  };
}
