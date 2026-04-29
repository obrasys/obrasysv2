import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PlanPage {
  id: string;
  plan_import_id: string;
  user_id: string;
  page_number: number;
  floor_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlanPages(planImportId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pagesQuery = useQuery({
    queryKey: ["plan-pages", planImportId],
    queryFn: async () => {
      if (!planImportId) return [] as PlanPage[];
      const { data, error } = await supabase
        .from("plan_pages")
        .select("*")
        .eq("plan_import_id", planImportId)
        .order("page_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PlanPage[];
    },
    enabled: !!planImportId && !!user,
  });

  const upsertPage = useMutation({
    mutationFn: async (input: { page_number: number; floor_id?: string | null; notes?: string }) => {
      if (!user || !planImportId) throw new Error("Não autenticado");
      // Try update first
      const { data: existing } = await supabase
        .from("plan_pages")
        .select("id")
        .eq("plan_import_id", planImportId)
        .eq("page_number", input.page_number)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await supabase
          .from("plan_pages")
          .update({
            floor_id: input.floor_id ?? null,
            notes: input.notes ?? null,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as PlanPage;
      }

      const { data, error } = await supabase
        .from("plan_pages")
        .insert({
          plan_import_id: planImportId,
          user_id: user.id,
          page_number: input.page_number,
          floor_id: input.floor_id ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PlanPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-pages", planImportId] });
    },
    onError: (err: Error) => toast.error("Erro ao guardar página: " + err.message),
  });

  const assignFloor = useMutation({
    mutationFn: async ({ pageId, floorId }: { pageId: string; floorId: string | null }) => {
      const { data, error } = await supabase
        .from("plan_pages")
        .update({ floor_id: floorId })
        .eq("id", pageId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PlanPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-pages", planImportId] });
      toast.success("Pavimento associado à página");
    },
    onError: (err: Error) => toast.error("Erro ao associar pavimento: " + err.message),
  });

  return {
    pages: pagesQuery.data ?? [],
    isLoading: pagesQuery.isLoading,
    upsertPage,
    assignFloor,
  };
}
