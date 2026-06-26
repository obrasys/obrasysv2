// Shared guard for Axia edge functions (Fase 2 hardening).
//
// Resolves the caller's organization_id, applies a per-organization rate-limit
// via `checkAxiaRateLimit`, and returns a small toolkit with the admin client,
// a scrubber, and an early `Response` when the limit is exceeded.
//
// Usage:
//
//   const guard = await axiaGuard(req, {
//     module: "axia_budget_insights", windowSeconds: 60, maxCalls: 10,
//     corsHeaders,
//   });
//   if (guard.response) return guard.response;
//   const { admin, userId, organizationId, scrub } = guard;

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAxiaRateLimit } from "./axiaRateLimit.ts";
import { scrubPII, scrubMessages } from "./scrubPII.ts";

export interface AxiaGuardOptions {
  module: string;
  windowSeconds: number;
  maxCalls: number;
  corsHeaders: Record<string, string>;
}

export interface AxiaGuardOk {
  response: null;
  admin: SupabaseClient;
  userClient: SupabaseClient;
  userId: string;
  organizationId: string | null;
  scrub: (s: string) => string;
  scrubMessages: typeof scrubMessages;
}

export interface AxiaGuardFail {
  response: Response;
}

export type AxiaGuardResult = AxiaGuardOk | AxiaGuardFail;

export async function axiaGuard(
  req: Request,
  opts: AxiaGuardOptions,
): Promise<AxiaGuardResult> {
  const { module, windowSeconds, maxCalls, corsHeaders } = opts;
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      response: new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: jsonHeaders,
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);
  if (authError || !claimsData?.claims) {
    return {
      response: new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: jsonHeaders,
      }),
    };
  }
  const userId = claimsData.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceKey);

  // Resolve organization_id; fail-open (no rate-limit) if unresolved to keep
  // backward compatibility with non-membership flows (e.g. supplier-only).
  let organizationId: string | null = null;
  try {
    const { data: orgRow } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("member_status", "active")
      .limit(1)
      .maybeSingle();
    organizationId = (orgRow?.organization_id as string | undefined) ?? null;
  } catch (_) {
    organizationId = null;
  }

  if (organizationId) {
    const rl = await checkAxiaRateLimit(admin, {
      organizationId,
      userId,
      module,
      windowSeconds,
      maxCalls,
    });
    if (!rl.allowed) {
      return {
        response: new Response(JSON.stringify({ error: rl.message }), {
          status: 429, headers: jsonHeaders,
        }),
      };
    }
  }

  return {
    response: null,
    admin,
    userClient,
    userId,
    organizationId,
    scrub: scrubPII,
    scrubMessages,
  };
}
