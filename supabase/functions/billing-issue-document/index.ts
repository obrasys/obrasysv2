import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";
import { buildProvider, loadIntegration, buildContext } from "../_shared/billing/providers/ProviderFactory.ts";
import { writeLog } from "../_shared/billing/logs.ts";

const Body = z.object({
  document_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405);

  const t0 = Date.now();
  let ctx;
  try {
    ctx = await authenticate(req);
    await requirePermission(ctx, "issue");
  } catch (e) {
    if (e instanceof BillingError) return errorResponse(e.code, e.message, e.status);
    return errorResponse("INTERNAL", (e as Error).message, 500);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Invalid payload", 400, { issues: parsed.error.flatten() });

  const { document_id } = parsed.data;

  try {
    const { data: doc, error: docErr } = await ctx.admin
      .from("billing_documents")
      .select("*")
      .eq("id", document_id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (docErr || !doc) return errorResponse("DOCUMENT_NOT_FOUND", "Document not found", 404);
    if (["issued", "paid", "partially_paid", "credited", "cancelled"].includes(doc.internal_status)) {
      return errorResponse("ALREADY_ISSUED", `Document is ${doc.internal_status}`, 409, {
        external_document_id: doc.external_document_id,
      });
    }
    if (!doc.integration_id) return errorResponse("NO_INTEGRATION", "Document has no integration_id", 400);

    // Customer mapping (auto-sync if missing)
    let externalCustomerId: string | null = null;
    if (!doc.cliente_id) {
      return errorResponse("NO_CLIENT", "Document has no client", 400);
    }
    const { data: bc } = await ctx.admin
      .from("billing_customers")
      .select("external_customer_id")
      .eq("integration_id", doc.integration_id)
      .eq("cliente_id", doc.cliente_id)
      .maybeSingle();
    externalCustomerId = bc?.external_customer_id ?? null;

    if (!externalCustomerId) {
      // Auto-create on provider
      const { data: cli } = await ctx.admin
        .from("clientes")
        .select("*")
        .eq("id", doc.cliente_id)
        .maybeSingle();
      if (!cli) return errorResponse("CLIENT_NOT_FOUND", "Client not found", 404);

      const intRow = await loadIntegration(ctx.admin, ctx.organizationId, doc.integration_id);
      const intProvider = buildProvider(intRow.provider);
      const intCtx = await buildContext(ctx.admin, intRow);

      const customerInput = {
        internalId: cli.id,
        name: cli.nome ?? cli.name ?? "",
        nif: cli.nif ?? null,
        email: cli.email ?? null,
        phone: cli.telefone ?? cli.phone ?? null,
        address: cli.endereco ?? cli.morada ?? cli.address ?? null,
        postalCode: cli.codigo_postal ?? cli.postal_code ?? null,
        city: cli.cidade ?? cli.city ?? null,
        country: cli.pais ?? cli.country ?? "PT",
      };
      if (!customerInput.name) return errorResponse("CUSTOMER_MISSING_NAME", "Client has no name", 400);

      const ext = await intProvider.upsertCustomer(intCtx, customerInput);
      externalCustomerId = ext.externalCustomerId;

      await ctx.admin.from("billing_customers").upsert({
        organization_id: ctx.organizationId,
        integration_id: doc.integration_id,
        cliente_id: doc.cliente_id,
        external_customer_id: ext.externalCustomerId,
        external_payload: ext.raw ?? {},
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "integration_id,cliente_id" });
    }

    const { data: lines, error: linesErr } = await ctx.admin
      .from("billing_document_lines")
      .select("*")
      .eq("document_id", document_id)
      .order("line_order", { ascending: true });
    if (linesErr) throw linesErr;
    if (!lines || lines.length === 0) return errorResponse("NO_LINES", "Document has no lines", 400);

    // Mark as issuing (best-effort lock)
    await ctx.admin
      .from("billing_documents")
      .update({ internal_status: "issuing", updated_at: new Date().toISOString() })
      .eq("id", document_id);

    const row = await loadIntegration(ctx.admin, ctx.organizationId, doc.integration_id);
    const provider = buildProvider(row.provider);
    const provCtx = await buildContext(ctx.admin, row);

    const draft = {
      documentType: doc.document_type,
      currency: doc.currency,
      customer: { externalCustomerId },
      notes: doc.notes ?? null,
      idempotencyKey: doc.idempotency_key,
      lines: lines.map((l) => ({
        code: l.code, description: l.description, unit: l.unit,
        quantity: Number(l.quantity), unitPrice: Number(l.unit_price),
        discountPct: Number(l.discount_pct), taxRate: Number(l.tax_rate),
        taxExemptionCode: l.tax_exemption_code,
        retentionRate: Number(l.retention_rate),
      })),
    };

    let issued;
    try {
      issued = await provider.issueDocument(provCtx, draft);
    } catch (e) {
      await ctx.admin
        .from("billing_documents")
        .update({ internal_status: "error", updated_at: new Date().toISOString() })
        .eq("id", document_id);
      throw e;
    }

    await ctx.admin
      .from("billing_documents")
      .update({
        internal_status: "issued",
        external_document_id: issued.externalDocumentId,
        external_number: issued.externalNumber ?? null,
        external_series: issued.externalSeries ?? null,
        external_status: issued.externalStatus ?? "issued",
        external_issued_at: issued.externalIssuedAt ?? new Date().toISOString(),
        external_pdf_url: issued.externalPdfUrl ?? null,
        external_payload: issued.raw ?? null,
        issued_by: ctx.userId,
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    await ctx.admin
      .from("billing_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", doc.integration_id);

    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id: doc.integration_id,
      document_id,
      operation: "issue_document",
      status: "success",
      idempotency_key: doc.idempotency_key,
      response_payload: issued,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });

    return jsonResponse({ document_id, external: issued });
  } catch (e) {
    const msg = (e as Error).message;
    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      document_id,
      operation: "issue_document",
      status: "error",
      error_message: msg,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });
    return errorResponse("ISSUE_FAILED", msg, 500);
  }
});
