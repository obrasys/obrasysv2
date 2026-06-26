// Lightweight rate-limit helper for edge functions that already validate auth.
// Just resolves organization_id for `userId` and runs the per-org limiter.
// Returns a 429 Response if the limit is exceeded, otherwise `null`.
//
// Usage:
//
//   const limited = await rateLimitOrg(userId, {
//     module: "validate_budget_ai", windowSeconds: 60, maxCalls: 10, corsHeaders,
//   });
//   if (limited) return limited;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAxiaRateLimit } from "./axiaRateLimit.ts";

export interface RateLimitOrgOptions {
  module: string;
  windowSeconds: number;
  maxCalls: number;
  corsHeaders: Record<string, string>;
}

export async function rateLimitOrg(
  userId: string,
  opts: RateLimitOrgOptions,
): Promise<Response | null> {
  const { module, windowSeconds, maxCalls, corsHeaders } = opts;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: orgRow } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("member_status", "active")
      .limit(1)
      .maybeSingle();
    const organizationId = (orgRow?.organization_id as string | undefined) ?? null;
    if (!organizationId) return null; // fail-open for users sem organização

    const rl = await checkAxiaRateLimit(admin, {
      organizationId, userId, module, windowSeconds, maxCalls,
    });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: rl.message }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return null;
  } catch (e) {
    console.warn("[rateLimitOrg] failing open:", (e as Error).message);
    return null;
  }
}
