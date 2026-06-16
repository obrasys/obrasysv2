import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";
import { buildProvider, loadIntegration, buildContext } from "../_shared/billing/providers/ProviderFactory.ts";
import { writeLog } from "../_shared/billing/logs.ts";

const Body = z.object({
  integration_id: z.string().uuid(),
  // Optional: if provided, persist these credentials before testing.
  credentials: z.record(z.unknown()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405);

  const t0 = Date.now();
  let ctx;
  try {
    ctx = await authenticate(req);
    await requirePermission(ctx, "configure");
  } catch (e) {
    if (e instanceof BillingError) return errorResponse(e.code, e.message, e.status);
    return errorResponse("INTERNAL", (e as Error).message, 500);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Invalid payload", 400, { issues: parsed.error.flatten() });

  const { integration_id, credentials } = parsed.data;

  try {
    if (credentials) {
      await ctx.admin.rpc("billing_vault_put", { p_integration_id: integration_id, p_payload: credentials });
    }
    const row = await loadIntegration(ctx.admin, ctx.organizationId, integration_id);
    const provider = buildProvider(row.provider);
    const provCtx = await buildContext(ctx.admin, row);
    const result = await provider.testConnection(provCtx);

    await ctx.admin
      .from("billing_integrations")
      .update({
        last_connection_test_at: new Date().toISOString(),
        last_connection_test_status: result.status,
        status: result.status === "ok" || result.status === "stub" ? "configured" : (result.status === "not_configured" ? "not_configured" : "error"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration_id);

    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id,
      operation: "test_connection",
      status: result.status === "error" ? "error" : "success",
      response_payload: result,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });

    return jsonResponse(result);
  } catch (e) {
    const msg = (e as Error).message;
    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id,
      operation: "test_connection",
      status: "error",
      error_message: msg,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });
    return errorResponse("TEST_FAILED", msg, 500);
  }
});
