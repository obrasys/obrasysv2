import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";
import { computeTotals, computeIdempotencyKey } from "../_shared/billing/totals.ts";
import { writeLog } from "../_shared/billing/logs.ts";

const LineSchema = z.object({
  source_line_id: z.string().uuid().nullable().optional(),
  code: z.string().nullable().optional(),
  description: z.string().min(1).max(500),
  unit: z.string().max(20).nullable().optional(),
  quantity: z.number(),
  unit_price: z.number(),
  discount_pct: z.number().min(0).max(100).optional(),
  tax_rate: z.number().min(0).max(100),
  tax_exemption_code: z.string().max(20).nullable().optional(),
  retention_rate: z.number().min(0).max(100).optional(),
});

const Body = z.object({
  integration_id: z.string().uuid(),
  obra_id: z.string().uuid().nullable().optional(),
  cliente_id: z.string().uuid(),
  source_type: z.enum(["orcamento", "auto_medicao", "folha_fecho", "mce_map", "manual"]),
  source_id: z.string().uuid().nullable().optional(),
  source_revision: z.number().int().min(1).default(1),
  document_type: z.enum(["invoice", "simplified_invoice", "credit_note", "debit_note", "receipt", "proforma"]),
  currency: z.string().length(3).default("EUR"),
  notes: z.string().max(2000).nullable().optional(),
  lines: z.array(LineSchema).min(1).max(500),
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
  const b = parsed.data;

  try {
    // Validate client + integration belong to caller's org.
    const { data: cli } = await ctx.admin.from("clientes").select("id").eq("id", b.cliente_id).maybeSingle();
    if (!cli) return errorResponse("CLIENT_NOT_FOUND", "Client not found", 404);

    const { data: integ } = await ctx.admin
      .from("billing_integrations")
      .select("id")
      .eq("id", b.integration_id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (!integ) return errorResponse("INTEGRATION_NOT_FOUND", "Integration not found", 404);

    // Recalculate everything server-side. Client-supplied totals are ignored.
    const totals = computeTotals(b.lines);
    const idempotencyKey = await computeIdempotencyKey({
      organization_id: ctx.organizationId,
      source_type: b.source_type,
      source_id: b.source_id ?? null,
      document_type: b.document_type,
      revision: b.source_revision,
    });

    // Upsert document (idempotent by organization + idempotency_key).
    const { data: existing } = await ctx.admin
      .from("billing_documents")
      .select("id, internal_status")
      .eq("organization_id", ctx.organizationId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing && ["issued", "paid", "partially_paid", "credited", "cancelled"].includes(existing.internal_status)) {
      return errorResponse("ALREADY_ISSUED", "Document already issued; cannot re-prepare", 409, { document_id: existing.id });
    }

    let documentId: string;
    if (existing) {
      documentId = existing.id;
      await ctx.admin
        .from("billing_documents")
        .update({
          integration_id: b.integration_id,
          obra_id: b.obra_id ?? null,
          cliente_id: b.cliente_id,
          source_type: b.source_type,
          source_id: b.source_id ?? null,
          source_revision: b.source_revision,
          document_type: b.document_type,
          internal_status: "ready",
          currency: b.currency,
          subtotal_net: totals.subtotal_net,
          total_tax: totals.total_tax,
          total_retention: totals.total_retention,
          total_gross: totals.total_gross,
          total_payable: totals.total_payable,
          notes: b.notes ?? null,
          prepared_by: ctx.userId,
          prepared_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      await ctx.admin.from("billing_document_lines").delete().eq("document_id", documentId);
    } else {
      const { data: ins, error: insErr } = await ctx.admin
        .from("billing_documents")
        .insert({
          organization_id: ctx.organizationId,
          integration_id: b.integration_id,
          obra_id: b.obra_id ?? null,
          cliente_id: b.cliente_id,
          source_type: b.source_type,
          source_id: b.source_id ?? null,
          source_revision: b.source_revision,
          document_type: b.document_type,
          internal_status: "ready",
          currency: b.currency,
          subtotal_net: totals.subtotal_net,
          total_tax: totals.total_tax,
          total_retention: totals.total_retention,
          total_gross: totals.total_gross,
          total_payable: totals.total_payable,
          idempotency_key: idempotencyKey,
          notes: b.notes ?? null,
          prepared_by: ctx.userId,
          prepared_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      documentId = ins.id;
    }

    const linesPayload = totals.lines.map((l) => ({
      document_id: documentId,
      organization_id: ctx.organizationId,
      line_order: l.line_order,
      source_line_id: l.source_line_id ?? null,
      code: l.code ?? null,
      description: l.description,
      unit: l.unit ?? null,
      quantity: l.quantity,
      unit_price: l.unit_price,
      discount_pct: l.discount_pct,
      tax_rate: l.tax_rate,
      tax_exemption_code: l.tax_exemption_code ?? null,
      retention_rate: l.retention_rate,
      net_amount: l.net_amount,
      tax_amount: l.tax_amount,
      retention_amount: l.retention_amount,
      gross_amount: l.gross_amount,
    }));
    const { error: linesErr } = await ctx.admin.from("billing_document_lines").insert(linesPayload);
    if (linesErr) throw linesErr;

    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id: b.integration_id,
      document_id: documentId,
      operation: "prepare_document",
      status: "success",
      idempotency_key: idempotencyKey,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });

    return jsonResponse({
      document_id: documentId,
      idempotency_key: idempotencyKey,
      totals: {
        subtotal_net: totals.subtotal_net,
        total_tax: totals.total_tax,
        total_retention: totals.total_retention,
        total_gross: totals.total_gross,
        total_payable: totals.total_payable,
      },
    });
  } catch (e) {
    const msg = (e as Error).message;
    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id: b.integration_id,
      operation: "prepare_document",
      status: "error",
      error_message: msg,
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });
    return errorResponse("PREPARE_FAILED", msg, 500);
  }
});
