import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type IntakeItem = {
  id: string;
  user_id: string;
  obra_id: string | null;
  voice_command_id: string | null;
  item_type: "pre_budget" | "rdo" | "financial_record" | "material_need" | "task" | "unknown";
  title: string;
  summary: string | null;
  extracted_data: Record<string, unknown>;
  confidence: number;
  status: "pending_review" | "approved" | "rejected" | "converted" | "needs_more_info";
  target_entity_type: string | null;
  target_entity_id: string | null;
  missing_fields: string[];
  axia_questions: string[];
  created_at: string;
};

export type DashboardAlert = {
  id: string;
  alert_type: "pre_budget_pending" | "rdo_pending" | "financial_missing_project" | "axia_needs_review";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  source_entity_type: string | null;
  source_entity_id: string | null;
  status: "open" | "resolved" | "dismissed";
  action_label: string | null;
  action_url: string | null;
  created_at: string;
  obra_id: string | null;
};

export function useCreateAndProcessVoiceCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      transcript: string;
      sourceContext: "global" | "project" | "financial" | "rdo" | "pre_budget";
      obraId?: string | null;
      audioBlob?: Blob | null;
      language?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Não autenticado");

      let audio_file_path: string | null = null;
      if (input.audioBlob) {
        const path = `${user.id}/${crypto.randomUUID()}.webm`;
        const { error: upErr } = await supabase.storage
          .from("voice-intake")
          .upload(path, input.audioBlob, { contentType: "audio/webm" });
        if (!upErr) audio_file_path = path;
      }

      const { data: cmd, error: cmdErr } = await supabase
        .from("voice_commands")
        .insert({
          user_id: user.id,
          obra_id: input.obraId ?? null,
          source_context: input.sourceContext,
          transcript: input.transcript,
          language: input.language ?? "pt-PT",
          audio_file_path,
        })
        .select("id")
        .single();
      if (cmdErr || !cmd) throw new Error(cmdErr?.message ?? "Erro ao registar comando");

      const { data: result, error: fnErr } = await supabase.functions.invoke("process-voice-command", {
        body: { voice_command_id: cmd.id },
      });
      if (fnErr) {
        const msg = fnErr.message ?? "Erro a processar com Axia";
        throw new Error(msg);
      }
      return { voice_command_id: cmd.id, ...(result as { status: string; created_items: any[]; alerts_created: number }) };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["axia-intake-items"] });
      qc.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      qc.invalidateQueries({ queryKey: ["voice-commands"] });
    },
    onError: (e: Error) => {
      toast.error("Axia", { description: e.message });
    },
  });
}

export function useIntakeItems(filters?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: ["axia-intake-items", filters],
    queryFn: async () => {
      let q = supabase
        .from("axia_intake_items")
        .select("*, obra:obras(id, nome)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filters?.type) q = q.eq("item_type", filters.type);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data as Array<IntakeItem & { obra: { id: string; nome: string } | null }>;
    },
  });
}

export function useUpdateIntakeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IntakeItem["status"] }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("axia_intake_items")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: userData.user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["axia-intake-items"] });
      qc.invalidateQueries({ queryKey: ["dashboard-alerts"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_alerts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DashboardAlert[];
    },
    refetchInterval: 60000,
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dashboard_alerts")
        .update({ status: "dismissed", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-alerts"] }),
  });
}
