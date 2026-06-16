import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";

const Body = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum(["manual_export", "keyinvoice", "invoicexpress", "moloni", "vendus"]),
  environment: z.enum(["sandbox", "production"]),
  name: z.string().min(1).max(120),
  api_base_url: z.string().url().optional().or(z.literal("")),
  account_id: z.string().max(120).optional(),
  organization_external_id: z.string().max(120).optional(),
  credentials: z.record(z.string()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405);

  let ctx;
  try {
    ctx = await authenticate(req);
    await requirePermission(ctx, "configure");
  } catch (e) {
    if (e instanceof BillingError) return errorResponse(e.code, e.message, e.status);
    return errorResponse("INTERNAL", (e as Error).message, 500);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse("INVALID_INPUT", "Invalid payload", 400, { issues: parsed.error.flatten() });
  }
  const { id, credentials, api_base_url, ...rest } = parsed.data;

  const row = {
    ...rest,
    api_base_url: api_base_url || null,
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    status: "not_configured" as const,
    is_active: true,
    settings_json: {},
    updated_at: new Date().toISOString(),
  };

  try {
    let integrationId = id;

    // If no id was passed, check for an existing active integration for this provider
    if (!integrationId) {
      const { data: existing } = await ctx.admin
        .from("billing_integrations")
        .select("id")
        .eq("organization_id", ctx.organizationId)
        .eq("provider", rest.provider)
        .eq("is_active", true)
        .maybeSingle();
      if (existing?.id) integrationId = existing.id;
    }

    if (integrationId) {
      const { error } = await ctx.admin
        .from("billing_integrations")
        .update(row)
        .eq("id", integrationId)
        .eq("organization_id", ctx.organizationId);
      if (error) throw error;
    } else {
      const { data, error } = await ctx.admin
        .from("billing_integrations")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      integrationId = data.id;
    }

    if (credentials && Object.keys(credentials).length > 0) {
      const { error: vErr } = await ctx.admin.rpc("billing_vault_put", {
        p_integration_id: integrationId,
        p_payload: credentials,
      });
      if (vErr) throw vErr;
    }

    return jsonResponse({ id: integrationId, ok: true });
  } catch (e) {
    return errorResponse("SAVE_FAILED", (e as Error).message, 500);
  }
});
