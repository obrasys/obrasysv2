import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";
import { buildProvider, loadIntegration, buildContext } from "../_shared/billing/providers/ProviderFactory.ts";
import { writeLog } from "../_shared/billing/logs.ts";

const Body = z.object({
  integration_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405);

  const t0 = Date.now();
  let ctx;
  try {
    ctx = await authenticate(req);
    await requirePermission(ctx, "prepare");
  } catch (e) {
    if (e instanceof BillingError) return errorResponse(e.code, e.message, e.status);
    return errorResponse("INTERNAL", (e as Error).message, 500);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Invalid payload", 400, { issues: parsed.error.flatten() });

  const { integration_id, cliente_id } = parsed.data;

  try {
    // Read internal client via service role, scoped to the same org.
    const { data: cli, error: cliErr } = await ctx.admin
      .from("clientes")
      .select("*")
      .eq("id", cliente_id)
      .maybeSingle();
    if (cliErr || !cli) return errorResponse("CLIENT_NOT_FOUND", "Client not found", 404);

    const row = await loadIntegration(ctx.admin, ctx.organizationId, integration_id);
    const provider = buildProvider(row.provider);
    const provCtx = await buildContext(ctx.admin, row);

    const customerInput = {
      internalId: cli.id,
      name: cli.nome ?? cli.name ?? "",
      nif: cli.nif ?? null,
      email: cli.email ?? null,
      phone: cli.telefone ?? cli.phone ?? null,
      address: cli.morada ?? cli.address ?? null,
      postalCode: cli.codigo_postal ?? cli.postal_code ?? null,
      city: cli.cidade ?? cli.city ?? null,
      country: cli.pais ?? cli.country ?? "PT",
    };

    if (!customerInput.name) return errorResponse("CUSTOMER_MISSING_NAME", "Client has no name", 400);

    const ext = await provider.upsertCustomer(provCtx, customerInput);

    const { data: saved, error: upErr } = await ctx.admin
      .from("billing_customers")
      .upsert({
        organization_id: ctx.organizationId,
        integration_id,
        cliente_id,
        external_customer_id: ext.externalCustomerId,
        external_payload: ext.raw ?? {},
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "integration_id,cliente_id" })
      .select()
      .single();
    if (upErr) throw upErr;

    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id,
      operation: "upsert_customer",
      status: "success",
      response_payload: ext,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });

    return jsonResponse({ billing_customer: saved });
  } catch (e) {
    const msg = (e as Error).message;
    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id,
      operation: "upsert_customer",
      status: "error",
      error_message: msg,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });
    return errorResponse("UPSERT_CUSTOMER_FAILED", msg, 500);
  }
});
