import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanImport, PlanDisciplina } from "@/types/plan-measurements";

type Ctx = { obraId?: string; budgetId?: string };

function normalizeCtx(input?: string | Ctx): Ctx {
  if (!input) return {};
  if (typeof input === "string") return { obraId: input };
  return input;
}

export function usePlanImports(input?: string | Ctx) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { obraId, budgetId } = normalizeCtx(input);
  const scopeKey = budgetId ? `budget:${budgetId}` : obraId ? `obra:${obraId}` : "none";

  const planImportsQuery = useQuery({
    queryKey: ["plan-imports", scopeKey],
    queryFn: async () => {
      if (!obraId && !budgetId) return [];
      let q = supabase
        .from("plan_imports")
        .select("*")
        .order("revision_number", { ascending: false });
      if (budgetId) q = q.eq("budget_id", budgetId);
      else if (obraId) q = q.eq("obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PlanImport[];
    },
    enabled: (!!obraId || !!budgetId) && !!user,
  });

  const uploadPlan = useMutation({
    mutationFn: async (params: {
      file: File;
      obraId?: string;
      budgetId?: string;
      disciplina: PlanDisciplina;
      dataPlanta?: string;
      observacoes?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const targetObra = params.obraId ?? obraId ?? null;
      const targetBudget = params.budgetId ?? budgetId ?? null;
      if (!targetObra && !targetBudget) {
        throw new Error("É necessário associar a planta a um orçamento ou obra.");
      }

      // Validar que o orçamento ainda existe (evita FK violation por URL desatualizado).
      if (targetBudget) {
        const { data: budgetRow, error: budgetErr } = await supabase
          .from("orcamentos")
          .select("id")
          .eq("id", targetBudget)
          .maybeSingle();
        if (budgetErr) throw budgetErr;
        if (!budgetRow) {
          throw new Error(
            "O orçamento associado a este URL já não existe ou foi eliminado. Volte à lista de orçamentos e abra a planta a partir de um orçamento válido.",
          );
        }
      }

      const { file, disciplina, dataPlanta, observacoes } = params;

      // ── Validação de upload ─────────────────────────────────────────────
      // Fase 3: DXF é processado por parser determinístico no servidor.
      // Aceitamos até 20 MB para DXF (texto vetorial) e 25 MB para os restantes.
      const MAX_BYTES_RASTER = 25 * 1024 * 1024;
      const MAX_BYTES_DXF = 20 * 1024 * 1024;
      const ALLOWED_RASTER_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      const ALLOWED_DXF_MIME = ["application/dxf", "application/x-dxf", "image/vnd.dxf", "application/octet-stream", ""];
      const ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg", "dxf"];
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isDxf = ext === "dxf";

      if (!file || file.size === 0) {
        throw new Error("Não foi possível carregar o ficheiro. Verifique se o documento não está corrompido.");
      }
      const sizeLimit = isDxf ? MAX_BYTES_DXF : MAX_BYTES_RASTER;
      if (file.size > sizeLimit) {
        throw new Error(`O ficheiro excede o limite de ${isDxf ? "20" : "25"} MB.`);
      }
      const mimeOk = isDxf
        ? ALLOWED_DXF_MIME.includes(file.type)
        : ALLOWED_RASTER_MIME.includes(file.type);
      if (!ALLOWED_EXT.includes(ext) || !mimeOk) {
        throw new Error("Este ficheiro não é suportado. Use PDF, DXF, PNG ou JPG.");
      }

      // Next revision number (scoped to the link in use)
      let revQuery = supabase
        .from("plan_imports")
        .select("revision_number")
        .order("revision_number", { ascending: false })
        .limit(1);
      if (targetBudget) revQuery = revQuery.eq("budget_id", targetBudget);
      else if (targetObra) revQuery = revQuery.eq("obra_id", targetObra);
      const { data: existing } = await revQuery;
      const nextRevision = (existing?.[0]?.revision_number ?? 0) + 1;

      // Upload file
      const fileExt = ext || "pdf";
      const scopeFolder = targetBudget ?? targetObra;
      const filePath = `${user.id}/${scopeFolder}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("plan-files")
        .upload(filePath, file, isDxf ? { contentType: "application/dxf" } : undefined);
      if (uploadError) throw uploadError;

      const fileType = isDxf
        ? "dxf"
        : file.type.includes("pdf")
        ? "pdf"
        : file.type.includes("png")
        ? "png"
        : "jpg";

      const { data, error } = await supabase
        .from("plan_imports")
        .insert({
          obra_id: targetObra,
          budget_id: targetBudget,
          user_id: user.id,
          file_path: filePath,
          file_type: fileType,
          nome_ficheiro: file.name,
          disciplina,
          revision_number: nextRevision,
          data_planta: dataPlanta || null,
          observacoes: observacoes || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as PlanImport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-imports", scopeKey] });
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
      queryClient.invalidateQueries({ queryKey: ["plan-imports", scopeKey] });
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
