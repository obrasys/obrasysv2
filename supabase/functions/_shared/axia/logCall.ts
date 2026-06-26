// Centralized logger for every Axia AI call.
//
// Why this exists (Fase 3 — Estabilização):
//   - Tornar obrigatório o registo de `axia_ai_logs` em todas as funções edge
//     que invocam um modelo de IA (Lovable AI Gateway, NVIDIA, etc.).
//   - Garantir um único formato (módulo, task_type, provider, modelo, status,
//     latência, erro) — antes cada função inseria à mão com colunas diferentes
//     e o `error_message` podia vazar payload.
//   - Falhas no logging NUNCA podem partir a chamada do utilizador → toda a
//     escrita é envolvida em try/catch silencioso, igual ao padrão existente.
//
// Uso típico:
//   const t0 = Date.now();
//   try {
//     const out = await callModel(...);
//     await logAxiaCall(admin, { module: 'axia_chat', task_type: 'chat',
//       provider_used: 'lovable', model_used: 'google/gemini-2.5-pro',
//       status: 'ok', latency_ms: Date.now() - t0,
//       organization_id: orgId, user_id: userId });
//     return out;
//   } catch (e) {
//     await logAxiaCall(admin, { ..., status: 'error',
//       latency_ms: Date.now() - t0, error_message: (e as Error).message });
//     throw e;
//   }

// Use a structural type for the admin client so this helper works regardless
// of which `@supabase/supabase-js` version each function pins.
type AdminClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};

export type AxiaLogStatus = "ok" | "success" | "error" | "fallback" | "rate_limited";

export interface AxiaLogEntry {
  module: string;
  task_type: string;
  status: AxiaLogStatus;
  organization_id?: string | null;
  user_id?: string | null;
  provider_used?: string | null;
  model_used?: string | null;
  latency_ms?: number | null;
  /**
   * Free-form error description. Will be truncated to 500 chars to keep
   * the table small and to avoid accidental payload leakage.
   */
  error_message?: string | null;
}

const MAX_ERROR_LEN = 500;

/**
 * Insert one row into `axia_ai_logs`. Never throws — log failures are reported
 * to the function console only, so the caller's response path stays clean.
 */
export async function logAxiaCall(
  admin: AdminClient,
  entry: AxiaLogEntry,
): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      module: entry.module,
      task_type: entry.task_type,
      status: entry.status,
      organization_id: entry.organization_id ?? null,
      user_id: entry.user_id ?? null,
      provider_used: entry.provider_used ?? null,
      model_used: entry.model_used ?? null,
      latency_ms: entry.latency_ms ?? null,
      error_message: entry.error_message
        ? entry.error_message.slice(0, MAX_ERROR_LEN)
        : null,
    };
    const { error } = await admin.from("axia_ai_logs").insert(row);
    if (error) {
      console.error(
        `logAxiaCall: insert failed for ${entry.module}/${entry.task_type}:`,
        (error as { message?: string })?.message ?? error,
      );
    }
  } catch (e) {
    console.error(
      `logAxiaCall: unexpected error for ${entry.module}/${entry.task_type}:`,
      (e as Error).message,
    );
  }
}
