// Shared helper for Edge Functions — validates the caller's JWT and returns
// the authenticated user along with a request-scoped Supabase client that
// enforces RLS for that user. Created in Fase 0 of the security hardening
// plan (.lovable/plan.md); to be wired into individual functions in Fase 2.
//
// Usage:
//   const auth = await requireUser(req);
//   if (auth instanceof Response) return auth; // 401 already formatted
//   const { user, supabase } = auth;
//
// Do NOT import this from frontend code.

import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
  token: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function jsonError(status: number, message: string, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Validate the `Authorization: Bearer <jwt>` header and return an auth context.
 * Returns a 401 `Response` on failure so callers can short-circuit:
 *
 *   const auth = await requireUser(req, corsHeaders);
 *   if (auth instanceof Response) return auth;
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string> = {},
): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return jsonError(401, "Missing bearer token", corsHeaders);
  }
  const token = authHeader.slice(7).trim();
  if (!token) return jsonError(401, "Empty bearer token", corsHeaders);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonError(500, "Server misconfigured: SUPABASE_URL/SUPABASE_ANON_KEY missing", corsHeaders);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return jsonError(401, "Invalid or expired session", corsHeaders);
  }

  return { user: data.user, supabase, token };
}

/**
 * Validate the JWT and require the user to be a super admin (per public.super_admins).
 */
export async function requireSuperAdmin(
  req: Request,
  corsHeaders: Record<string, string> = {},
): Promise<AuthContext | Response> {
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const { data, error } = await auth.supabase.rpc("is_super_admin");
  if (error || data !== true) {
    return jsonError(403, "Super admin only", corsHeaders);
  }
  return auth;
}
