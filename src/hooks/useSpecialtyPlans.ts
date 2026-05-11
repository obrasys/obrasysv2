import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SpecialtyPlan, SpecialtyType } from "@/types/especialidades";

export function useSpecialtyPlans(obraId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["specialty-plans", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from("specialty_plans" as any)
        .select("*")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SpecialtyPlan[];
    },
    enabled: !!obraId && !!user,
  });

  const uploadPlan = useMutation({
    mutationFn: async ({
      file,
      obraId,
      specialty_type,
      floor_level,
      declared_scale,
      observacoes,
    }: {
      file: File;
      obraId: string;
      specialty_type: SpecialtyType;
      floor_level?: string;
      declared_scale?: string;
      observacoes?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const MAX_BYTES = 25 * 1024 * 1024;
      const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      const ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg"];
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!file || file.size === 0) throw new Error("Ficheiro inválido.");
      if (file.size > MAX_BYTES) throw new Error("O ficheiro excede o limite de 25 MB.");
      if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
        throw new Error("Use PDF, PNG ou JPG.");
      }

      const filePath = `${user.id}/${obraId}/especialidades/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("plan-files").upload(filePath, file);
      if (upErr) throw upErr;

      const fileType = file.type.includes("pdf") ? "pdf" : file.type.includes("png") ? "png" : "jpg";

      const { data, error } = await supabase
        .from("specialty_plans" as any)
        .insert({
          obra_id: obraId,
          user_id: user.id,
          file_path: filePath,
          file_type: fileType,
          nome_ficheiro: file.name,
          specialty_type,
          floor_level: floor_level || null,
          declared_scale: declared_scale || null,
          observacoes: observacoes || null,
          status: "uploaded",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SpecialtyPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialty-plans", obraId] });
      toast.success("Planta de especialidade carregada");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const plan = plansQuery.data?.find((p) => p.id === planId);
      if (plan) await supabase.storage.from("plan-files").remove([plan.file_path]);
      const { error } = await supabase.from("specialty_plans" as any).delete().eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialty-plans", obraId] });
      toast.success("Planta eliminada");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  return {
    plans: plansQuery.data ?? [],
    isLoading: plansQuery.isLoading,
    uploadPlan,
    deletePlan,
  };
}

export function useSpecialtyPlan(planId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["specialty-plan", planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from("specialty_plans" as any)
        .select("*")
        .eq("id", planId)
        .single();
      if (error) throw error;
      return data as unknown as SpecialtyPlan;
    },
    enabled: !!planId && !!user,
  });
}
