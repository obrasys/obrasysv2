// KeyInvoice adapter — implementação REST contra a API pública KeyInvoice.
// Autenticação: Bearer api_key (guardado em Vault em credentials.api_key).
// Base URL pode ser sobreposto via billing_integrations.api_base_url.

import {
  BillingProvider, ProviderContext, TestConnectionResult,
  CustomerInput, ExternalCustomer, DocumentDraft, IssueResult, SyncResult,
  ProviderNotConfiguredError,
} from "./BillingProvider.ts";

const DEFAULT_BASE = "https://api.keyinvoice.pt/v1";

interface KeyInvoiceCreds {
  api_key?: string;
}

const DOC_TYPE_MAP: Record<DocumentDraft["documentType"], string> = {
  invoice: "FT",
  simplified_invoice: "FS",
  credit_note: "NC",
  debit_note: "ND",
  receipt: "RC",
  proforma: "PF",
};

function authHeader(ctx: ProviderContext): string {
  const creds = (ctx.credentials ?? {}) as KeyInvoiceCreds;
  if (!creds.api_key) throw new ProviderNotConfiguredError("keyinvoice");
  return `Bearer ${creds.api_key}`;
}

function baseUrl(ctx: ProviderContext): string {
  return (ctx.apiBaseUrl || DEFAULT_BASE).replace(/\/+$/, "");
}

async function kiFetch(
  ctx: ProviderContext,
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<any> {
  const headers: Record<string, string> = {
    "Authorization": authHeader(ctx),
    "Accept": "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const r = await fetch(`${baseUrl(ctx)}${path}`, { ...init, headers });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    const msg = (body && (body.message || body.error || body.error_description))
      || `KeyInvoice HTTP ${r.status}`;
    const err = new Error(`KEYINVOICE_${r.status}: ${msg}`);
    (err as any).status = r.status;
    (err as any).body = body;
    throw err;
  }
  return body;
}

function buildCustomerPayload(c: CustomerInput): Record<string, unknown> {
  return {
    name: c.name,
    tax_id: c.nif ?? undefined,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    address: c.address ?? undefined,
    postal_code: c.postalCode ?? undefined,
    city: c.city ?? undefined,
    country: c.country ?? "PT",
    external_id: c.internalId,
  };
}

function buildDocumentPayload(draft: DocumentDraft): Record<string, unknown> {
  return {
    document_type: DOC_TYPE_MAP[draft.documentType] ?? "FT",
    currency: draft.currency || "EUR",
    customer_id: draft.customer.externalCustomerId,
    notes: draft.notes ?? undefined,
    credited_document_id: draft.creditedExternalDocumentId ?? undefined,
    lines: draft.lines.map((l) => ({
      code: l.code ?? undefined,
      description: l.description,
      unit: l.unit ?? "un",
      quantity: l.quantity,
      unit_price: l.unitPrice,
      discount_pct: l.discountPct ?? 0,
      tax_rate: l.taxRate,
      tax_exemption_code: l.taxExemptionCode ?? undefined,
      retention_rate: l.retentionRate ?? 0,
    })),
  };
}

function mapIssue(body: any): IssueResult {
  const d = body?.document ?? body ?? {};
  return {
    externalDocumentId: String(d.id ?? d.document_id ?? d.uuid ?? ""),
    externalNumber: d.number ?? d.document_number ?? null,
    externalSeries: d.series ?? null,
    externalStatus: d.status ?? "issued",
    externalIssuedAt: d.issued_at ?? d.date ?? new Date().toISOString(),
    externalPdfUrl: d.pdf_url ?? null,
    raw: d,
  };
}

export class KeyInvoiceAdapter implements BillingProvider {
  readonly id = "keyinvoice" as const;

  async testConnection(ctx: ProviderContext): Promise<TestConnectionResult> {
    const creds = (ctx.credentials ?? {}) as KeyInvoiceCreds;
    if (!creds.api_key) return { status: "not_configured", message: "API Key não configurada." };
    try {
      await kiFetch(ctx, "/account", { method: "GET" });
      return { status: "ok", message: "Ligação KeyInvoice verificada." };
    } catch (e) {
      return { status: "error", message: (e as Error).message };
    }
  }

  async upsertCustomer(ctx: ProviderContext, c: CustomerInput): Promise<ExternalCustomer> {
    const payload = buildCustomerPayload(c);
    // Tenta procurar por external_id (idempotência). Se não existir, cria.
    try {
      const found = await kiFetch(ctx, `/customers?external_id=${encodeURIComponent(c.internalId)}`, { method: "GET" });
      const existing = Array.isArray(found?.data) ? found.data[0] : (Array.isArray(found) ? found[0] : null);
      if (existing?.id) {
        const updated = await kiFetch(ctx, `/customers/${existing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const row = updated?.customer ?? updated ?? existing;
        return { externalCustomerId: String(row.id ?? existing.id), raw: row };
      }
    } catch (e) {
      // 404 na busca é aceitável — segue para create.
      if ((e as any).status && (e as any).status !== 404) throw e;
    }
    const created = await kiFetch(ctx, "/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const row = created?.customer ?? created;
    if (!row?.id) throw new Error("KEYINVOICE: resposta inválida ao criar cliente");
    return { externalCustomerId: String(row.id), raw: row };
  }

  async issueDocument(ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult> {
    const payload = buildDocumentPayload(draft);
    const body = await kiFetch(ctx, "/documents", {
      method: "POST",
      body: JSON.stringify(payload),
      idempotencyKey: draft.idempotencyKey,
    });
    return mapIssue(body);
  }

  async syncDocumentStatus(ctx: ProviderContext, externalDocumentId: string): Promise<SyncResult> {
    const body = await kiFetch(ctx, `/documents/${encodeURIComponent(externalDocumentId)}`, { method: "GET" });
    const d = body?.document ?? body ?? {};
    return {
      externalStatus: d.status ?? "unknown",
      externalPdfUrl: d.pdf_url ?? null,
      raw: d,
    };
  }

  async getDocumentPdfUrl(ctx: ProviderContext, externalDocumentId: string): Promise<string | null> {
    try {
      const body = await kiFetch(ctx, `/documents/${encodeURIComponent(externalDocumentId)}/pdf`, { method: "GET" });
      return body?.url ?? body?.pdf_url ?? null;
    } catch {
      const body = await kiFetch(ctx, `/documents/${encodeURIComponent(externalDocumentId)}`, { method: "GET" });
      const d = body?.document ?? body ?? {};
      return d.pdf_url ?? null;
    }
  }

  async createCreditNote(ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult> {
    return this.issueDocument(ctx, { ...draft, documentType: "credit_note" });
  }
}
