import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";
import { buildProvider, loadIntegration, buildContext } from "../_shared/billing/providers/ProviderFactory.ts";
import { computeIdempotencyKey } from "../_shared/billing/totals.ts";
import { writeLog } from "../_shared/billing/logs.ts";

const Body = z.object({
  source_document_id: z.string().uuid(),
  reason: z.string().min(3).max(500),
  // Optional partial credit: subset of line_orders with optional quantity overrides.
  partial_lines: z.array(z.object({
    line_order: z.number().int().min(0),
    quantity: z.number().positive().optional(),
  })).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405);

  const t0 = Date.now();
  let ctx;
  try {
    ctx = await authenticate(req);
    await requirePermission(ctx, "credit_note");
  } catch (e) {
    if (e instanceof BillingError) return errorResponse(e.code, e.message, e.status);
    return errorResponse("INTERNAL", (e as Error).message, 500);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Invalid payload", 400, { issues: parsed.error.flatten() });
  const { source_document_id, reason, partial_lines } = parsed.data;

  try {
    const { data: src } = await ctx.admin
      .from("billing_documents")
      .select("*")
      .eq("id", source_document_id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (!src) return errorResponse("DOCUMENT_NOT_FOUND", "Source document not found", 404);
    if (!["issued", "paid", "partially_paid"].includes(src.internal_status)) {
      return errorResponse("NOT_CREDITABLE", `Source status is ${src.internal_status}`, 400);
    }
    if (!src.integration_id) return errorResponse("NO_INTEGRATION", "Source has no integration", 400);

    const { data: srcLines } = await ctx.admin
      .from("billing_document_lines")
      .select("*")
      .eq("document_id", source_document_id)
      .order("line_order");
    if (!srcLines || srcLines.length === 0) return errorResponse("NO_LINES", "Source has no lines", 400);

    // Filter lines if partial
    const selected = partial_lines && partial_lines.length > 0
      ? srcLines.filter((l) => partial_lines.some((p) => p.line_order === l.line_order))
        .map((l) => {
          const ovr = partial_lines.find((p) => p.line_order === l.line_order);
          return ovr?.quantity ? { ...l, quantity: ovr.quantity } : l;
        })
      : srcLines;

    // Customer mapping (already created from original issue)
    const { data: bc } = await ctx.admin
      .from("billing_customers")
      .select("external_customer_id")
      .eq("integration_id", src.integration_id)
      .eq("cliente_id", src.cliente_id)
      .maybeSingle();
    if (!bc) return errorResponse("CUSTOMER_NOT_SYNCED", "Customer mapping missing", 400);

    const row = await loadIntegration(ctx.admin, ctx.organizationId, src.integration_id);
    const provider = buildProvider(row.provider);
    const provCtx = await buildContext(ctx.admin, row);

    const idempotencyKey = await computeIdempotencyKey({
      organization_id: ctx.organizationId,
      source_type: src.source_type,
      source_id: source_document_id,                // use source doc id
      document_type: "credit_note",
      revision: 1,
    });

    const draft = {
      documentType: "credit_note" as const,
      currency: src.currency,
      customer: { externalCustomerId: bc.external_customer_id },
      notes: reason,
      idempotencyKey,
      creditedExternalDocumentId: src.external_document_id ?? null,
      lines: selected.map((l) => ({
        code: l.code, description: l.description, unit: l.unit,
        quantity: Number(l.quantity), unitPrice: Number(l.unit_price),
        discountPct: Number(l.discount_pct), taxRate: Number(l.tax_rate),
        taxExemptionCode: l.tax_exemption_code,
        retentionRate: Number(l.retention_rate),
      })),
    };

    const issued = await provider.createCreditNote(provCtx, draft);

    // Persist credit note doc
    const subtotal = selected.reduce((s, l) => s + Number(l.net_amount), 0);
    const tax = selected.reduce((s, l) => s + Number(l.tax_amount), 0);
    const ret = selected.reduce((s, l) => s + Number(l.retention_amount), 0);
    const gross = subtotal + tax;
    const r2 = (n: number) => Math.round(n * 100) / 100;

    const { data: cn, error: cnErr } = await ctx.admin
      .from("billing_documents")
      .insert({
        organization_id: ctx.organizationId,
        integration_id: src.integration_id,
        obra_id: src.obra_id,
        cliente_id: src.cliente_id,
        source_type: src.source_type,
        source_id: source_document_id,
        source_revision: 1,
        document_type: "credit_note",
        internal_status: "issued",
        currency: src.currency,
        subtotal_net: r2(subtotal),
        total_tax: r2(tax),
        total_retention: r2(ret),
        total_gross: r2(gross),
        total_payable: r2(gross - ret),
        external_document_id: issued.externalDocumentId,
        external_number: issued.externalNumber ?? null,
        external_series: issued.externalSeries ?? null,
        external_status: issued.externalStatus ?? "issued",
        external_issued_at: issued.externalIssuedAt ?? new Date().toISOString(),
        external_pdf_url: issued.externalPdfUrl ?? null,
        external_payload: issued.raw ?? null,
        idempotency_key: idempotencyKey,
        credited_document_id: source_document_id,
        notes: reason,
        prepared_by: ctx.userId,
        prepared_at: new Date().toISOString(),
        issued_by: ctx.userId,
        issued_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (cnErr) throw cnErr;

    // Copy lines snapshot
    await ctx.admin.from("billing_document_lines").insert(
      selected.map((l, i) => ({
        document_id: cn.id,
        organization_id: ctx.organizationId,
        line_order: i,
        code: l.code, description: l.description, unit: l.unit,
        quantity: l.quantity, unit_price: l.unit_price,
        discount_pct: l.discount_pct, tax_rate: l.tax_rate,
        tax_exemption_code: l.tax_exemption_code, retention_rate: l.retention_rate,
        net_amount: l.net_amount, tax_amount: l.tax_amount,
        retention_amount: l.retention_amount, gross_amount: l.gross_amount,
      }))
    );

    // Mark source as credited (full credit only)
    if (!partial_lines || partial_lines.length === srcLines.length) {
      await ctx.admin
        .from("billing_documents")
        .update({ internal_status: "credited", updated_at: new Date().toISOString() })
        .eq("id", source_document_id);
    }

    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id: src.integration_id,
      document_id: cn.id,
      operation: "create_credit_note",
      status: "success",
      idempotency_key: idempotencyKey,
      response_payload: issued,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });

    return jsonResponse({ credit_note_id: cn.id, external: issued });
  } catch (e) {
    return errorResponse("CREDIT_NOTE_FAILED", (e as Error).message, 500);
  }
});
