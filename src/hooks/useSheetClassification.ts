import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  SheetDiscipline,
  SheetType,
  DetectedFloor,
} from "@/lib/plan-sheet-classification";

export interface ClassifiedPage {
  id: string;
  plan_import_id: string;
  page_number: number;
  sheet_title: string | null;
  drawing_code: string | null;
  discipline: SheetDiscipline | null;
  sheet_type: SheetType | null;
  detected_floor: DetectedFloor | null;
  should_extract_quantities: boolean;
  use_for_validation_only: boolean;
  classification_confidence: number | null;
  classification_warnings: string[];
  classified_by: string | null;
  classified_at: string | null;
}

export function useSheetClassification(planImportId?: string) {
  const { session } = useAuth();
  const qc = useQueryClient();

  const pagesQuery = useQuery({
    queryKey: ["plan-pages-classified", planImportId],
    enabled: !!planImportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_pages")
        .select(
          "id, plan_import_id, page_number, sheet_title, drawing_code, discipline, sheet_type, detected_floor, should_extract_quantities, use_for_validation_only, classification_confidence, classification_warnings, classified_by, classified_at",
        )
        .eq("plan_import_id", planImportId!)
        .order("page_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ClassifiedPage[];
    },
  });

  const classify = useMutation({
    mutationFn: async (payload: {
      pages: Array<{ page_number: number; image_base64?: string; text_hint?: string }>;
    }) => {
      if (!planImportId) throw new Error("plan_import_id em falta");
      if (!session?.access_token) throw new Error("Sessão expirada.");
      const { data, error } = await supabase.functions.invoke("axia-classify-sheets", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { plan_import_id: planImportId, pages: payload.pages },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Folhas classificadas com sucesso.");
      qc.invalidateQueries({ queryKey: ["plan-pages-classified", planImportId] });
    },
    onError: (e: any) => toast.error("Classificação falhou: " + (e?.message ?? "erro")),
  });

  const updatePage = useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<ClassifiedPage> }) => {
      const { error } = await supabase
        .from("plan_pages")
        .update({
          ...payload.updates,
          classified_by: "user",
          classified_at: new Date().toISOString(),
        } as any)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-pages-classified", planImportId] }),
    onError: (e: any) => toast.error("Não foi possível atualizar: " + (e?.message ?? "erro")),
  });

  return {
    pages: pagesQuery.data ?? [],
    isLoading: pagesQuery.isLoading,
    classify,
    updatePage,
  };
}
