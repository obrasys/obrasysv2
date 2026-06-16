// Safe stub for providers without sandbox credentials in this phase.
// Returns typed errors when credentials are missing; performs a real
// reachability test against api_base_url when credentials exist.

import {
  BillingProvider, ProviderContext, TestConnectionResult, ProviderId,
  CustomerInput, ExternalCustomer, DocumentDraft, IssueResult, SyncResult,
  ProviderNotImplementedError, ProviderNotConfiguredError,
} from "./BillingProvider.ts";

export class StubAdapter implements BillingProvider {
  constructor(public readonly id: ProviderId) {}

  async testConnection(ctx: ProviderContext): Promise<TestConnectionResult> {
    if (!ctx.credentials) {
      return { status: "not_configured", message: `Provider ${this.id} has no stored credentials.` };
    }
    if (ctx.apiBaseUrl) {
      try {
        const r = await fetch(ctx.apiBaseUrl, { method: "HEAD" });
        return {
          status: r.ok ? "stub" : "error",
          message: r.ok
            ? `Reachability OK (HEAD ${r.status}). Provider operations not implemented yet.`
            : `Endpoint returned ${r.status}.`,
          details: { http_status: r.status },
        };
      } catch (e) {
        return { status: "error", message: `Network error: ${(e as Error).message}` };
      }
    }
    return { status: "stub", message: "Credentials present but no api_base_url; adapter is stubbed." };
  }

  async upsertCustomer(ctx: ProviderContext, _c: CustomerInput): Promise<ExternalCustomer> {
    if (!ctx.credentials) throw new ProviderNotConfiguredError(this.id);
    throw new ProviderNotImplementedError(this.id, "upsertCustomer");
  }
  async issueDocument(ctx: ProviderContext, _d: DocumentDraft): Promise<IssueResult> {
    if (!ctx.credentials) throw new ProviderNotConfiguredError(this.id);
    throw new ProviderNotImplementedError(this.id, "issueDocument");
  }
  async syncDocumentStatus(ctx: ProviderContext, _id: string): Promise<SyncResult> {
    if (!ctx.credentials) throw new ProviderNotConfiguredError(this.id);
    throw new ProviderNotImplementedError(this.id, "syncDocumentStatus");
  }
  async getDocumentPdfUrl(ctx: ProviderContext, _id: string): Promise<string | null> {
    if (!ctx.credentials) throw new ProviderNotConfiguredError(this.id);
    throw new ProviderNotImplementedError(this.id, "getDocumentPdfUrl");
  }
  async createCreditNote(ctx: ProviderContext, _d: DocumentDraft): Promise<IssueResult> {
    if (!ctx.credentials) throw new ProviderNotConfiguredError(this.id);
    throw new ProviderNotImplementedError(this.id, "createCreditNote");
  }
}
