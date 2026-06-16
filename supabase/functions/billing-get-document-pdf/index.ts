import { z } from "npm:zod@3";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/billing/cors.ts";
import { authenticate, requirePermission, BillingError } from "../_shared/billing/auth.ts";
import { buildProvider, loadIntegration, buildContext } from "../_shared/billing/providers/ProviderFactory.ts";
import { writeLog } from "../_shared/billing/logs.ts";

const Body = z.object({ document_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405);

  const t0 = Date.now();
  let ctx;
  try {
    ctx = await authenticate(req);
    await requirePermission(ctx, "view");
  } catch (e) {
    if (e instanceof BillingError) return errorResponse(e.code, e.message, e.status);
    return errorResponse("INTERNAL", (e as Error).message, 500);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Invalid payload", 400, { issues: parsed.error.flatten() });
  const { document_id } = parsed.data;

  try {
    const { data: doc } = await ctx.admin
      .from("billing_documents")
      .select("*")
      .eq("id", document_id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (!doc) return errorResponse("DOCUMENT_NOT_FOUND", "Document not found", 404);

    // If already cached, return it
    if (doc.external_pdf_url) {
      return jsonResponse({ pdf_url: doc.external_pdf_url, source: "cache" });
    }
    if (!doc.external_document_id || !doc.integration_id) {
      return errorResponse("NOT_ISSUED", "Document is not issued yet", 400);
    }

    const row = await loadIntegration(ctx.admin, ctx.organizationId, doc.integration_id);
    const provider = buildProvider(row.provider);
    const provCtx = await buildContext(ctx.admin, row);

    const url = await provider.getDocumentPdfUrl(provCtx, doc.external_document_id);
    if (url) {
      await ctx.admin
        .from("billing_documents")
        .update({ external_pdf_url: url, updated_at: new Date().toISOString() })
        .eq("id", document_id);
    }
    await writeLog(ctx.admin, {
      organization_id: ctx.organizationId,
      integration_id: doc.integration_id,
      document_id,
      operation: "get_pdf",
      status: url ? "success" : "skipped",
      duration_ms: Date.now() - t0,
      triggered_by: ctx.userId,
    });

    return jsonResponse({ pdf_url: url, source: "provider" });
  } catch (e) {
    return errorResponse("GET_PDF_FAILED", (e as Error).message, 500);
  }
});
