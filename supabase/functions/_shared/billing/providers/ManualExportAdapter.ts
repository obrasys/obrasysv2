// 100% functional adapter — does NOT issue fiscal documents.
// Generates internal references for manual download/export workflows.

import {
  BillingProvider, ProviderContext, TestConnectionResult,
  CustomerInput, ExternalCustomer, DocumentDraft, IssueResult, SyncResult,
} from "./BillingProvider.ts";

export class ManualExportAdapter implements BillingProvider {
  readonly id = "manual_export" as const;

  async testConnection(_ctx: ProviderContext): Promise<TestConnectionResult> {
    return { status: "ok", message: "Manual export does not require credentials." };
  }

  async upsertCustomer(_ctx: ProviderContext, c: CustomerInput): Promise<ExternalCustomer> {
    // External id mirrors the internal id — clients can be exported as-is.
    return { externalCustomerId: `manual:${c.internalId}` };
  }

  async issueDocument(_ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult> {
    const ts = new Date();
    const ref = `EXP-${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}-${draft.idempotencyKey.slice(0, 8)}`;
    return {
      externalDocumentId: ref,
      externalNumber: ref,
      externalSeries: "EXP",
      externalStatus: "exported",
      externalIssuedAt: ts.toISOString(),
      externalPdfUrl: null,
      raw: { note: "Não constitui documento fiscal oficial." },
    };
  }

  async syncDocumentStatus(_ctx: ProviderContext, externalDocumentId: string): Promise<SyncResult> {
    return { externalStatus: "exported", externalPdfUrl: null, raw: { externalDocumentId } };
  }

  async getDocumentPdfUrl(_ctx: ProviderContext, _externalDocumentId: string): Promise<string | null> {
    return null; // PDFs are generated client-side from the stored document/lines.
  }

  async createCreditNote(ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult> {
    return this.issueDocument(ctx, { ...draft, documentType: "credit_note" });
  }
}
