// Shared rate-limit helper for Axia edge functions (Fase 2 do plano de correção).
//
// Usa a tabela `axia_rate_limits` e a função SECURITY DEFINER
// `axia_rate_limit_increment` (service_role) para contar chamadas por
// (organization_id, module, janela). A janela é arredondada para baixo ao
// múltiplo de `windowSeconds`.
//
// Uso típico (dentro de uma edge function):
//
//   const rl = await checkAxiaRateLimit(adminClient, {
//     organizationId, userId, module: "axia_chat",
//     windowSeconds: 60, maxCalls: 20,
//   });
//   if (!rl.allowed) {
//     return new Response(JSON.stringify({ error: rl.message }), {
//       status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface RateLimitOptions {
  organizationId: string;
  userId?: string | null;
  module: string;
  windowSeconds: number;
  maxCalls: number;
}

export interface RateLimitResult {
  allowed: boolean;
  calls: number;
  windowStart: string;
  message?: string;
}

function bucketStart(windowSeconds: number): Date {
  const now = Date.now();
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now / ms) * ms);
}

/**
 * Increments and checks the Axia rate-limit counter atomically.
 * Requires a Supabase client with `service_role` to invoke the SECURITY DEFINER RPC.
 * On any error (e.g. table not yet migrated) we fail-open and allow the call
 * so a bug in the limiter never takes Axia offline.
 */
export async function checkAxiaRateLimit(
  admin: SupabaseClient,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowStart = bucketStart(opts.windowSeconds);
  try {
    const { data, error } = await admin.rpc("axia_rate_limit_increment", {
      _organization_id: opts.organizationId,
      _user_id: opts.userId ?? null,
      _module: opts.module,
      _window_start: windowStart.toISOString(),
      _max_calls: opts.maxCalls,
    });

    if (error) {
      console.warn("[axiaRateLimit] RPC error, failing open:", error.message);
      return { allowed: true, calls: 0, windowStart: windowStart.toISOString() };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const calls = Number(row?.calls ?? 0);
    const allowed = Boolean(row?.allowed ?? true);

    return {
      allowed,
      calls,
      windowStart: windowStart.toISOString(),
      message: allowed
        ? undefined
        : `Limite de chamadas Axia excedido (${calls}/${opts.maxCalls} por ${opts.windowSeconds}s). Tente novamente em instantes.`,
    };
  } catch (e) {
    console.warn("[axiaRateLimit] exception, failing open:", (e as Error).message);
    return { allowed: true, calls: 0, windowStart: windowStart.toISOString() };
  }
}
