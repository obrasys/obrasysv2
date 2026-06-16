import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export type BillingPermission =
  | "view" | "configure" | "prepare" | "issue"
  | "cancel" | "credit_note" | "sync" | "view_logs";

export interface BillingContext {
  userId: string;
  organizationId: string;
  admin: SupabaseClient;       // service role — bypasses RLS
  asUser: SupabaseClient;      // user JWT — subject to RLS
}

export async function authenticate(req: Request): Promise<BillingContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new BillingError("UNAUTHORIZED", "Missing bearer token", 401);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await asUser.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new BillingError("UNAUTHORIZED", "Invalid token", 401);
  }
  const userId = data.claims.sub as string;

  // Resolve org membership via service role
  const { data: org, error: orgErr } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("member_status", "active")
    .maybeSingle();
  if (orgErr || !org) {
    throw new BillingError("NO_ORGANIZATION", "User has no active organization", 403);
  }

  return { userId, organizationId: org.organization_id as string, admin, asUser };
}

export async function requirePermission(ctx: BillingContext, perm: BillingPermission): Promise<void> {
  const { data, error } = await ctx.asUser.rpc("has_billing_permission", { _perm: perm });
  if (error) throw new BillingError("PERMISSION_CHECK_FAILED", error.message, 500);
  if (!data) throw new BillingError("FORBIDDEN", `Missing billing.${perm} permission`, 403);
}

export class BillingError extends Error {
  constructor(public code: string, message: string, public status = 400, public extra?: Record<string, unknown>) {
    super(message);
  }
}
