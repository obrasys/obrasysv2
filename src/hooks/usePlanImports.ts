import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanImport, PlanDisciplina } from "@/types/plan-measurements";

export function usePlanImports(obraId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const planImportsQuery = useQuery({
    queryKey: ["plan-imports", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from("plan_imports")
        .select("*")
        .eq("obra_id", obraId)
        .order("revision_number", { ascending: false });
      if (error) throw error;
      return data as PlanImport[];
    },
    enabled: !!obraId && !!user,
  });

  const uploadPlan = useMutation({
    mutationFn: async ({
      file,
      obraId,
      disciplina,
      dataPlanta,
      observacoes,
    }: {
      file: File;
      obraId: string;
      disciplina: PlanDisciplina;
      dataPlanta?: string;
      observacoes?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      // ── Validação de upload (Fase 5) ───────────────────────────────────────
      const MAX_BYTES = 25 * 1024 * 1024;
      const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      const ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg"];
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!file || file.size === 0) {
        throw new Error("Não foi possível carregar o ficheiro. Verifique se o documento não está corrompido.");
      }
      if (file.size > MAX_BYTES) {
        throw new Error("O ficheiro excede o limite de 25 MB.");
      }
      if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
        throw new Error("Este ficheiro não é suportado. Use PDF, PNG ou JPG.");
      }

      // Get next revision number
      const { data: existing } = await supabase
        .from("plan_imports")
        .select("revision_number")
        .eq("obra_id", obraId)
        .order("revision_number", { ascending: false })
        .limit(1);

      const nextRevision = (existing?.[0]?.revision_number ?? 0) + 1;

      // Upload file
      const ext = file.name.split(".").pop() || "pdf";
      const filePath = `${user.id}/${obraId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("plan-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Determine file type
      const fileType = file.type.includes("pdf")
        ? "pdf"
        : file.type.includes("png")
        ? "png"
        : "jpg";

      // Insert record
      const { data, error } = await supabase
        .from("plan_imports")
        .insert({
          obra_id: obraId,
          user_id: user.id,
          file_path: filePath,
          file_type: fileType,
          nome_ficheiro: file.name,
          disciplina,
          revision_number: nextRevision,
          data_planta: dataPlanta || null,
          observacoes: observacoes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PlanImport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-imports", obraId] });
      toast.success("Planta importada com sucesso");
    },
    onError: (err: Error) => {
      toast.error("Erro ao importar planta: " + err.message);
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const plan = planImportsQuery.data?.find((p) => p.id === planId);
      if (plan) {
        await supabase.storage.from("plan-files").remove([plan.file_path]);
      }
      const { error } = await supabase
        .from("plan_imports")
        .delete()
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-imports", obraId] });
      toast.success("Planta eliminada");
    },
    onError: (err: Error) => {
      toast.error("Erro ao eliminar: " + err.message);
    },
  });

  return {
    plans: planImportsQuery.data ?? [],
    isLoading: planImportsQuery.isLoading,
    uploadPlan,
    deletePlan,
  };
}
