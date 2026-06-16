// Canonical interface for all billing providers (spec §5).

export type ProviderId = "keyinvoice" | "invoicexpress" | "moloni" | "vendus" | "manual_export";

export interface ProviderCredentials {
  // Free-form per provider; never logged.
  [k: string]: unknown;
}

export interface ProviderContext {
  integrationId: string;
  organizationId: string;
  environment: "sandbox" | "production";
  apiBaseUrl?: string | null;
  accountId?: string | null;
  organizationExternalId?: string | null;
  settings: Record<string, unknown>;
  credentials: ProviderCredentials | null;
  // Allows the adapter to rotate refreshed tokens back into Vault.
  rotateCredentials?: (next: ProviderCredentials) => Promise<void>;
}

export interface TestConnectionResult {
  status: "ok" | "not_configured" | "error" | "stub";
  message?: string;
  details?: Record<string, unknown>;
}

export interface ExternalCustomer {
  externalCustomerId: string;
  raw?: Record<string, unknown>;
}

export interface CustomerInput {
  internalId: string;
  name: string;
  nif?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface DocumentLineInput {
  code?: string | null;
  description: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxRate: number;            // %
  taxExemptionCode?: string | null;
  retentionRate?: number;     // %
}

export interface DocumentDraft {
  documentType: "invoice" | "simplified_invoice" | "credit_note" | "debit_note" | "receipt" | "proforma";
  currency: string;
  customer: { externalCustomerId: string };
  lines: DocumentLineInput[];
  notes?: string | null;
  idempotencyKey: string;
  creditedExternalDocumentId?: string | null;
}

export interface IssueResult {
  externalDocumentId: string;
  externalNumber?: string | null;
  externalSeries?: string | null;
  externalStatus?: string | null;
  externalIssuedAt?: string | null;
  externalPdfUrl?: string | null;
  raw?: Record<string, unknown>;
}

export interface SyncResult {
  externalStatus: string;
  externalPdfUrl?: string | null;
  raw?: Record<string, unknown>;
}

export interface BillingProvider {
  readonly id: ProviderId;
  testConnection(ctx: ProviderContext): Promise<TestConnectionResult>;
  upsertCustomer(ctx: ProviderContext, customer: CustomerInput): Promise<ExternalCustomer>;
  issueDocument(ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult>;
  syncDocumentStatus(ctx: ProviderContext, externalDocumentId: string): Promise<SyncResult>;
  getDocumentPdfUrl(ctx: ProviderContext, externalDocumentId: string): Promise<string | null>;
  createCreditNote(ctx: ProviderContext, draft: DocumentDraft): Promise<IssueResult>;
}

export class ProviderNotImplementedError extends Error {
  constructor(provider: ProviderId, op: string) {
    super(`Operation '${op}' not implemented for provider '${provider}'`);
    this.name = "ProviderNotImplementedError";
  }
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: ProviderId) {
    super(`Provider '${provider}' has no credentials configured`);
    this.name = "ProviderNotConfiguredError";
  }
}
