import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";
import { computeTotals, computeIdempotencyKey } from "../_shared/billing/totals.ts";
import { writeLog } from "../_shared/billing/logs.ts";

const Body = z.object({
  auto_id: z.string().uuid(),
  integration_id: z.string().uuid(),
  document_type: z
    .enum(["invoice", "simplified_invoice", "proforma"])
    .default("invoice"),
  notes: z.string().max(2000).nullable().optional(),
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
  if (!parsed.success) {
    return errorResponse("INVALID_INPUT", "Invalid payload", 400, {
      issues: parsed.error.flatten(),
    });
  }
  const b = parsed.data;

  try {
    // Load auto + obra (to get cliente_id)
    const { data: auto, error: autoErr } = await ctx.admin
      .from("autos_medicao")
      .select("id, obra_id, taxa_iva, numero_auto, codigo_referencia, estado")
      .eq("id", b.auto_id)
      .maybeSingle();
    if (autoErr) throw autoErr;
    if (!auto) return errorResponse("AUTO_NOT_FOUND", "Auto de medição não encontrado", 404);

    const { data: obra } = await ctx.admin
      .from("obras")
      .select("id, cliente_id, organization_id")
      .eq("id", auto.obra_id)
      .maybeSingle();
    if (!obra) return errorResponse("OBRA_NOT_FOUND", "Obra não encontrada", 404);
    if (obra.organization_id !== ctx.organizationId) {
      return errorResponse("FORBIDDEN", "Obra fora da organização", 403);
    }
    if (!obra.cliente_id) {
      return errorResponse("NO_CLIENT", "A obra não tem cliente associado", 400);
    }

    // Validate integration belongs to org
    const { data: integ } = await ctx.admin
      .from("billing_integrations")
      .select("id")
      .eq("id", b.integration_id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (!integ) return errorResponse("INTEGRATION_NOT_FOUND", "Integração não encontrada", 404);

    // Load auto items (only those with quantidade_atual > 0)
    const { data: itens, error: itensErr } = await ctx.admin
      .from("autos_medicao_itens")
      .select("id, codigo, descricao, unidade, quantidade_atual, preco_unitario, ordem")
      .eq("auto_id", b.auto_id)
      .order("ordem", { ascending: true });
    if (itensErr) throw itensErr;

    const billableLines = (itens ?? []).filter(
      (i) => Number(i.quantidade_atual ?? 0) > 0 && Number(i.preco_unitario ?? 0) > 0,
    );
    if (billableLines.length === 0) {
      return errorResponse(
        "NO_BILLABLE_LINES",
        "Auto sem itens faturáveis (quantidade/preço a 0).",
        400,
      );
    }

    const taxRate = Number(auto.taxa_iva ?? 23);
    const lines = billableLines.map((i) => ({
      source_line_id: i.id,
      code: i.codigo ?? null,
      description: i.descricao ?? "—",
      unit: i.unidade ?? null,
      quantity: Number(i.quantidade_atual),
      unit_price: Number(i.preco_unitario),
      discount_pct: 0,
      tax_rate: taxRate,
      retention_rate: 0,
    }));

    const totals = computeTotals(lines);
    const revision = 1;
    const idempotencyKey = await computeIdempotencyKey({
      organization_id: ctx.organizationId,
      source_type: "auto_medicao",
      source_id: b.auto_id,
      document_type: b.document_type,
      revision,
    });

    const { data: existing } = await ctx.admin
      .from("billing_documents")
      .select("id, internal_status")
      .eq("organization_id", ctx.organizationId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (
      existing &&
      ["issued", "paid", "partially_paid", "credited", "cancelled"].includes(
        existing.internal_status,
      )
    ) {
      return errorResponse("ALREADY_ISSUED", "Documento já emitido", 409, {
        document_id: existing.id,
      });
    }

    let documentId: string;
    const payload = {
      organization_id: ctx.organizationId,
      integration_id: b.integration_id,
      obra_id: obra.id,
      cliente_id: obra.cliente_id,
      source_type: "auto_medicao",
      source_id: b.auto_id,
      source_revision: revision,
      document_type: b.document_type,
      internal_status: "ready",
      currency: "EUR",
      subtotal_net: totals.subtotal_net,
      total_tax: totals.total_tax,
      total_retention: totals.total_retention,
      total_gross: totals.total_gross,
      total_payable: totals.total_payable,
      notes: b.notes ?? `Auto de Medição nº ${auto.numero_auto ?? ""}`.trim(),
      prepared_by: ctx.userId,
      prepared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      documentId = existing.id;
      await ctx.admin.from("billing_documents").update(payload).eq("id", documentId);
      await ctx.admin.from("billing_document_lines").delete().eq("document_id", documentId);
    } else {
      const { data: ins, error: insErr } = await ctx.admin
        .from("billing_documents")
        .insert({ ...payload, idempotency_key: idempotencyKey })
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
      tax_exemption_code: null,
      retention_rate: l.retention_rate,
      net_amount: l.net_amount,
      tax_amount: l.tax_amount,
      retention_amount: l.retention_amount,
      gross_amount: l.gross_amount,
    }));
    const { error: linesErr } = await ctx.admin
      .from("billing_document_lines")
      .insert(linesPayload);
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
