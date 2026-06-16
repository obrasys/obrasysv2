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
  // Check via service role to avoid auth.uid() dependency in RPC context.
  // Org admins/owners get implicit access; otherwise look up explicit member_module_permissions.
  const { data: memberships, error: memErr } = await ctx.admin
    .from("organization_members")
    .select("id, role")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.organizationId)
    .eq("member_status", "active");
  if (memErr) throw new BillingError("PERMISSION_CHECK_FAILED", memErr.message, 500);
  if (!memberships || memberships.length === 0) {
    throw new BillingError("FORBIDDEN", `Missing billing.${perm} permission`, 403);
  }
  if (memberships.some((m) => m.role === "admin" || m.role === "owner")) return;

  const memberIds = memberships.map((m) => m.id);
  const { data: perms, error: pErr } = await ctx.admin
    .from("member_module_permissions")
    .select("can_view")
    .in("member_id", memberIds)
    .eq("module_code", `billing.${perm}`)
    .eq("can_view", true)
    .limit(1);
  if (pErr) throw new BillingError("PERMISSION_CHECK_FAILED", pErr.message, 500);
  if (!perms || perms.length === 0) {
    throw new BillingError("FORBIDDEN", `Missing billing.${perm} permission`, 403);
  }
}

export class BillingError extends Error {
  constructor(public code: string, message: string, public status = 400, public extra?: Record<string, unknown>) {
    super(message);
  }
}
