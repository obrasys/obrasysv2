import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { BillingProvider, ProviderContext, ProviderId, ProviderCredentials } from "./BillingProvider.ts";
import { ManualExportAdapter } from "./ManualExportAdapter.ts";
import { StubAdapter } from "./StubAdapter.ts";
import { MoloniAdapter } from "./MoloniAdapter.ts";
import { KeyInvoiceAdapter } from "./KeyInvoiceAdapter.ts";

export function buildProvider(id: ProviderId): BillingProvider {
  switch (id) {
    case "manual_export": return new ManualExportAdapter();
    case "moloni":        return new MoloniAdapter();
    case "keyinvoice":    return new KeyInvoiceAdapter();
    case "invoicexpress": return new StubAdapter("invoicexpress");
    case "vendus":        return new StubAdapter("vendus");
  }
}

export interface IntegrationRow {
  id: string;
  organization_id: string;
  provider: ProviderId;
  environment: "sandbox" | "production";
  api_base_url: string | null;
  account_id: string | null;
  organization_external_id: string | null;
  settings_json: Record<string, unknown>;
  vault_secret_id: string | null;
  status: string;
}

export async function loadIntegration(
  admin: SupabaseClient,
  organizationId: string,
  integrationId: string,
): Promise<IntegrationRow> {
  const { data, error } = await admin
    .from("billing_integrations")
    .select("id, organization_id, provider, environment, api_base_url, account_id, organization_external_id, settings_json, vault_secret_id, status")
    .eq("id", integrationId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) throw new Error(`Integration ${integrationId} not found`);
  return data as IntegrationRow;
}

export async function buildContext(
  admin: SupabaseClient,
  row: IntegrationRow,
): Promise<ProviderContext> {
  let credentials: ProviderCredentials | null = null;
  if (row.vault_secret_id) {
    const { data, error } = await admin.rpc("billing_vault_get", { p_integration_id: row.id });
    if (!error && data) credentials = data as ProviderCredentials;
  }
  return {
    integrationId: row.id,
    organizationId: row.organization_id,
    environment: row.environment,
    apiBaseUrl: row.api_base_url,
    accountId: row.account_id,
    organizationExternalId: row.organization_external_id,
    settings: row.settings_json ?? {},
    credentials,
    rotateCredentials: async (next) => {
      await admin.rpc("billing_vault_put", { p_integration_id: row.id, p_payload: next });
      const expiresAt = (next as { expires_at?: string }).expires_at ?? null;
      await admin
        .from("billing_integrations")
        .update({ token_expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    },
  };
}
