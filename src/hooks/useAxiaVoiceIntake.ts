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
    mutationFn: async ({ id, status, fromStatus }: { id: string; status: IntakeItem["status"]; fromStatus?: IntakeItem["status"] }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { error } = await supabase
        .from("axia_intake_items")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: userId })
        .eq("id", id);
      if (error) throw error;

      const action =
        status === "approved" ? "accepted" :
        status === "rejected" ? "rejected" :
        status === "converted" ? "converted" :
        status === "needs_more_info" ? "marked_needs_info" : "status_changed";

      if (userId) {
        await (supabase.from as any)("axia_intake_item_history").insert({
          intake_item_id: id,
          user_id: userId,
          action,
          from_status: fromStatus ?? null,
          to_status: status,
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["axia-intake-items"] });
      qc.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      qc.invalidateQueries({ queryKey: ["axia-intake-history", vars.id] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
}

export function useUpdateIntakeData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        title: string;
        summary: string | null;
        extracted_data: Record<string, unknown>;
        missing_fields: string[];
      }>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { error } = await (supabase as any)
        .from("axia_intake_items")
        .update({ ...patch, reviewed_at: new Date().toISOString(), reviewed_by: userId })
        .eq("id", id);
      if (error) throw error;

      if (userId) {
        await (supabase.from as any)("axia_intake_item_history").insert({
          intake_item_id: id,
          user_id: userId,
          action: "edited",
          notes: "Dados editados manualmente",
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["axia-intake-items"] });
      qc.invalidateQueries({ queryKey: ["axia-intake-item", vars.id] });
      qc.invalidateQueries({ queryKey: ["axia-intake-history", vars.id] });
      toast.success("Alterações guardadas");
    },
    onError: (e: Error) => toast.error("Erro ao guardar", { description: e.message }),
  });
}

export type IntakeHistoryEntry = {
  id: string;
  intake_item_id: string;
  user_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { nome: string | null; email: string | null } | null;
};

export function useIntakeItemHistory(itemId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["axia-intake-history", itemId],
    enabled: !!itemId && enabled,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("axia_intake_item_history")
        .select("*")
        .eq("intake_item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as IntakeHistoryEntry[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      if (userIds.length === 0) return rows;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nome, email")
        .in("user_id", userIds);
      const map = new Map((profiles ?? []).map((p: any) => [p.user_id, { nome: p.nome, email: p.email }]));
      return rows.map((r) => ({ ...r, actor: map.get(r.user_id) ?? null }));
    },
  });
}

export function useLogIntakeAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, action, notes, metadata }: { itemId: string; action: string; notes?: string; metadata?: Record<string, unknown> }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      await (supabase.from as any)("axia_intake_item_history").insert({
        intake_item_id: itemId,
        user_id: userId,
        action,
        notes: notes ?? null,
        metadata: metadata ?? {},
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["axia-intake-history", vars.itemId] });
    },
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
