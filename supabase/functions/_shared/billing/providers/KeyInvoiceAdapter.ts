// KeyInvoice adapter — API 5.0 (single endpoint POST).
// Endpoint default: https://login.keyinvoice.com/API5.php
// Auth: 2 passos →
//   1) POST {method:"authenticate"} c/ header `Apikey: <api_key>` → devolve Sid (válido ~1h)
//   2) Todas as chamadas seguintes c/ header `Sid: <sid>` e body {method:"...", ...params}
// Resposta: {Status:1, Data:{...}} ou {Status:0, ErrorMessage:"..."}

import {
  BillingProvider, ProviderContext, TestConnectionResult,
  CustomerInput, ExternalCustomer, DocumentDraft, IssueResult, SyncResult,
  ProviderNotConfiguredError,
} from "./BillingProvider.ts";

const DEFAULT_BASE = "https://login.keyinvoice.com/API5.php";

interface KeyInvoiceCreds {
  api_key?: string;
  default_product_id?: string; // IdProduct genérico para linhas (KeyInvoice obriga)
  doc_type_map?: Partial<Record<DocumentDraft["documentType"], string | number>>;
  doc_series?: string | number;
}

// Mapa default — KeyInvoice usa códigos numéricos por DocType (configurável por user via doc_type_map).
const DEFAULT_DOC_TYPE_MAP: Record<DocumentDraft["documentType"], string> = {
  invoice: "1",
  simplified_invoice: "2",
  credit_note: "3",
  debit_note: "4",
  receipt: "5",
  proforma: "6",
};

// Cache Sid em memória do worker (TTL 50min para segurança).
const sidCache = new Map<string, { sid: string; exp: number }>();
const SID_TTL_MS = 50 * 60 * 1000;

function baseUrl(ctx: ProviderContext): string {
  return (ctx.apiBaseUrl || DEFAULT_BASE).trim();
}

function getApiKey(ctx: ProviderContext): string {
  const creds = (ctx.credentials ?? {}) as KeyInvoiceCreds;
  if (!creds.api_key) throw new ProviderNotConfiguredError("keyinvoice");
  return creds.api_key;
}

async function rawCall(
  url: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
): Promise<any> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    const err = new Error(`KEYINVOICE_HTTP_${r.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    (err as any).status = r.status;
    throw err;
  }
  if (!body || typeof body !== "object") {
    throw new Error(`KEYINVOICE: resposta inválida (${typeof body})`);
  }
  if (body.Status === 0 || body.Status === "0") {
    throw new Error(`KEYINVOICE: ${body.ErrorMessage || "Erro desconhecido"}`);
  }
  return body.Data ?? {};
}

async function authenticate(ctx: ProviderContext): Promise<string> {
  const apiKey = getApiKey(ctx);
  const cached = sidCache.get(apiKey);
  if (cached && cached.exp > Date.now()) return cached.sid;

  // KeyInvoice aceita a ApiKey tanto via header como no corpo — enviamos ambos
  // para evitar "Configuração da chave API incompleta" quando o servidor lê de um sítio específico.
  const data = await rawCall(
    baseUrl(ctx),
    { Apikey: apiKey, ApiKey: apiKey },
    { method: "authenticate", ApiKey: apiKey, Apikey: apiKey, apikey: apiKey },
  );
  const sid = data?.Sid ?? data?.sid;
  if (!sid) throw new Error("KEYINVOICE: authenticate não devolveu Sid");
  sidCache.set(apiKey, { sid: String(sid), exp: Date.now() + SID_TTL_MS });
  return String(sid);
}

async function kiCall(ctx: ProviderContext, payload: Record<string, unknown>): Promise<any> {
  let sid = await authenticate(ctx);
  try {
    return await rawCall(baseUrl(ctx), { Sid: sid }, payload);
  } catch (e) {
    // Se Sid expirou, força refresh e tenta 1x.
    const msg = String((e as Error).message || "");
    if (/sess|sid|auth/i.test(msg)) {
      sidCache.delete(getApiKey(ctx));
      sid = await authenticate(ctx);
      return await rawCall(baseUrl(ctx), { Sid: sid }, payload);
    }
    throw e;
  }
}

function buildClientPayload(c: CustomerInput): Record<string, unknown> {
  const p: Record<string, unknown> = {
    Name: c.name,
    Address: c.address ?? undefined,
    PostalCode: c.postalCode ?? undefined,
    Locality: c.city ?? undefined,
    Phone: c.phone ?? undefined,
    Email: c.email ?? undefined,
  };
  if (c.nif) p.VATIN = c.nif;
  return p;
}

function resolveDocType(ctx: ProviderContext, t: DocumentDraft["documentType"]): string {
  const creds = (ctx.credentials ?? {}) as KeyInvoiceCreds;
  const fromCreds = creds.doc_type_map?.[t];
  if (fromCreds !== undefined && fromCreds !== null) return String(fromCreds);
  return DEFAULT_DOC_TYPE_MAP[t];
}

export class KeyInvoiceAdapter implements BillingProvider {
  readonly id = "keyinvoice" as const;

  async testConnection(ctx: ProviderContext): Promise<TestConnectionResult> {
    const creds = (ctx.credentials ?? {}) as KeyInvoiceCreds;
    if (!creds.api_key) return { status: "not_configured", message: "API Key não configurada." };
    try {
      await authenticate(ctx);
      return { status: "ok", message: "Ligação KeyInvoice verificada (Sid obtido)." };
    } catch (e) {
      return { status: "error", message: (e as Error).message };
    }
  }

  async upsertCustomer(ctx: ProviderContext, c: CustomerInput): Promise<ExternalCustomer> {
    const payload = buildClientPayload(c);

    // 1) Se temos NIF, tenta getClient por VATIN.
    if (c.nif) {
      try {
        const found = await kiCall(ctx, { method: "getClient", VATIN: c.nif });
        const id = found?.IdClient;
        if (id) {
          await kiCall(ctx, { method: "updateClient", IdClient: id, ...payload });
          return { externalCustomerId: String(id), raw: found };
        }
      } catch (_e) {
        // não encontrado → segue p/ insert
      }
    }

    // 2) Insert (KeyInvoice exige VATIN OU permite consumidor final sem ele em insertDocument,
    //    mas insertClient normalmente requer VATIN. Se não houver, devolvemos um marcador sintético
    //    que será resolvido em issueDocument via dados inline).
    if (!c.nif) {
      return { externalCustomerId: `inline:${c.internalId}`, raw: { inline: true } };
    }

    const created = await kiCall(ctx, { method: "insertClient", ...payload });
    const id = created?.IdClient ?? created?.Id;
    if (!id) throw new Error("KEYINVOICE: insertClient não devolveu IdClient");
    return { externalCustomerId: String(id), raw: created };
  }

  async issueDocument(ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult> {
    const creds = (ctx.credentials ?? {}) as KeyInvoiceCreds;
    const defaultProductId = creds.default_product_id ?? "1";

    const docPayload: Record<string, unknown> = {
      method: "insertDocument",
      DocType: resolveDocType(ctx, draft.documentType),
    };
    if (creds.doc_series !== undefined && creds.doc_series !== null) {
      docPayload.DocSeries = creds.doc_series;
    }

    // Cliente: externalCustomerId pode ser "inline:..." → omite IdClient (consumidor final).
    const extId = draft.customer.externalCustomerId;
    if (extId && !extId.startsWith("inline:")) {
      docPayload.IdClient = extId;
    }

    docPayload.DocDate = new Date().toISOString().slice(0, 10);
    if (draft.notes) docPayload.Comments = draft.notes;

    docPayload.DocLines = draft.lines.map((l) => ({
      IdProduct: l.code || defaultProductId,
      ProductName: l.description,
      Qty: l.quantity,
      Price: l.unitPrice,
      IdTax: l.taxRate, // KeyInvoice usa IdTax (id da taxa); user pode mapear via taxRate
      Discount: l.discountPct ?? 0,
    }));

    const data = await kiCall(ctx, docPayload);
    return {
      externalDocumentId: String(data?.FullDocNumber ?? data?.DocNum ?? ""),
      externalNumber: data?.FullDocNumber ?? data?.DocNum ?? null,
      externalSeries: data?.DocSeries ?? null,
      externalStatus: "issued",
      externalIssuedAt: new Date().toISOString(),
      externalPdfUrl: null,
      raw: data,
    };
  }

  async syncDocumentStatus(_ctx: ProviderContext, externalDocumentId: string): Promise<SyncResult> {
    // KeyInvoice API 5.0 não expõe getDocument status; documento emitido = "issued".
    return { externalStatus: "issued", externalPdfUrl: null, raw: { externalDocumentId } };
  }

  async getDocumentPdfUrl(ctx: ProviderContext, externalDocumentId: string): Promise<string | null> {
    // externalDocumentId guardamos como FullDocNumber tipo "FT A/2024/1" → precisamos DocType + DocNum.
    // Estratégia: aceitamos formato "DocType:DocNum" ou tentamos parse de FullDocNumber.
    let docType: string | undefined;
    let docNum: string | undefined;
    let docSeries: string | undefined;

    if (externalDocumentId.includes(":")) {
      [docType, docNum, docSeries] = externalDocumentId.split(":");
    } else {
      // FullDocNumber: "<TYPE> <SERIES>/<YEAR>/<NUM>" — tenta extrair último número
      const m = externalDocumentId.match(/^(\S+)\s+(\S+?)\/(\d+)\/(\d+)$/);
      if (m) { docType = m[1]; docSeries = m[2]; docNum = m[4]; }
      else { docNum = externalDocumentId; }
    }
    if (!docType || !docNum) return null;

    const data = await kiCall(ctx, {
      method: "getDocumentPDF",
      DocType: docType,
      DocNum: docNum,
      ...(docSeries ? { DocSeries: docSeries } : {}),
      Format: "A4",
    });
    const b64 = data?.DocumentBinary;
    if (!b64) return null;
    return `data:application/pdf;base64,${b64}`;
  }

  async createCreditNote(ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult> {
    return this.issueDocument(ctx, { ...draft, documentType: "credit_note" });
  }
}
