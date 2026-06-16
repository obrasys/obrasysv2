// Moloni adapter — stub for operations, but includes the token refresh
// scaffolding required by the spec. Real document issue is not implemented
// in this phase; when credentials exist and have expired, the adapter
// attempts a refresh and rotates the new tokens into Vault.

import {
  BillingProvider, ProviderContext, TestConnectionResult,
  CustomerInput, ExternalCustomer, DocumentDraft, IssueResult, SyncResult,
  ProviderNotImplementedError, ProviderNotConfiguredError,
} from "./BillingProvider.ts";

const DEFAULT_BASE = "https://api.moloni.pt";

interface MoloniCreds {
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string; // ISO
}

export class MoloniAdapter implements BillingProvider {
  readonly id = "moloni" as const;

  private async ensureFreshToken(ctx: ProviderContext): Promise<MoloniCreds> {
    const creds = (ctx.credentials ?? {}) as MoloniCreds;
    if (!creds.access_token || !creds.refresh_token) {
      throw new ProviderNotConfiguredError(this.id);
    }
    const exp = creds.expires_at ? new Date(creds.expires_at).getTime() : 0;
    if (exp > Date.now() + 60_000) return creds; // still valid (>60s)

    if (!creds.client_id || !creds.client_secret) {
      throw new Error("AUTH_EXPIRED: cannot refresh — missing client_id/client_secret");
    }
    const base = ctx.apiBaseUrl || DEFAULT_BASE;
    const url = `${base}/v1/grant/?grant_type=refresh_token&client_id=${encodeURIComponent(creds.client_id)}&client_secret=${encodeURIComponent(creds.client_secret)}&refresh_token=${encodeURIComponent(creds.refresh_token)}`;
    const r = await fetch(url, { method: "GET" });
    if (!r.ok) {
      throw new Error(`AUTH_EXPIRED: refresh failed (${r.status})`);
    }
    const j = await r.json();
    const next: MoloniCreds = {
      ...creds,
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? creds.refresh_token,
      expires_at: new Date(Date.now() + ((j.expires_in ?? 3600) * 1000)).toISOString(),
    };
    if (ctx.rotateCredentials) await ctx.rotateCredentials(next);
    return next;
  }

  async testConnection(ctx: ProviderContext): Promise<TestConnectionResult> {
    if (!ctx.credentials) return { status: "not_configured", message: "Moloni credentials not stored." };
    try {
      await this.ensureFreshToken(ctx);
      return { status: "stub", message: "Token validated/refreshed. Document operations not implemented yet." };
    } catch (e) {
      return { status: "error", message: (e as Error).message };
    }
  }

  async upsertCustomer(ctx: ProviderContext, _c: CustomerInput): Promise<ExternalCustomer> {
    await this.ensureFreshToken(ctx);
    throw new ProviderNotImplementedError(this.id, "upsertCustomer");
  }
  async issueDocument(ctx: ProviderContext, _d: DocumentDraft): Promise<IssueResult> {
    await this.ensureFreshToken(ctx);
    throw new ProviderNotImplementedError(this.id, "issueDocument");
  }
  async syncDocumentStatus(ctx: ProviderContext, _id: string): Promise<SyncResult> {
    await this.ensureFreshToken(ctx);
    throw new ProviderNotImplementedError(this.id, "syncDocumentStatus");
  }
  async getDocumentPdfUrl(ctx: ProviderContext, _id: string): Promise<string | null> {
    await this.ensureFreshToken(ctx);
    throw new ProviderNotImplementedError(this.id, "getDocumentPdfUrl");
  }
  async createCreditNote(ctx: ProviderContext, _d: DocumentDraft): Promise<IssueResult> {
    await this.ensureFreshToken(ctx);
    throw new ProviderNotImplementedError(this.id, "createCreditNote");
  }
}
