import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sanitize } from "./sanitize.ts";

export interface LogEntry {
  organization_id: string;
  integration_id?: string | null;
  document_id?: string | null;
  operation: string;
  status: "success" | "error" | "skipped";
  http_status?: number | null;
  retry_count?: number;
  idempotency_key?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  request_payload?: unknown;
  response_payload?: unknown;
  duration_ms?: number | null;
  triggered_by?: string | null;
}

export async function writeLog(admin: SupabaseClient, entry: LogEntry): Promise<void> {
  await admin.from("billing_sync_logs").insert({
    ...entry,
    request_payload: sanitize(entry.request_payload ?? null),
    response_payload: sanitize(entry.response_payload ?? null),
  });
}
