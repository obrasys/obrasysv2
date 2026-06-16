import type { Database } from "@/integrations/supabase/types";

export type BillingProvider = Database["public"]["Enums"]["billing_provider"];
export type BillingEnvironment = Database["public"]["Enums"]["billing_environment"];
export type BillingIntegrationStatus = Database["public"]["Enums"]["billing_integration_status"];
export type BillingDocumentType = Database["public"]["Enums"]["billing_document_type"];
export type BillingInternalStatus = Database["public"]["Enums"]["billing_internal_status"];
export type BillingSourceType = Database["public"]["Enums"]["billing_source_type"];

export type BillingIntegrationSafe =
  Database["public"]["Views"]["billing_integrations_safe"]["Row"];

export type BillingDocument = Database["public"]["Tables"]["billing_documents"]["Row"];
export type BillingDocumentLine =
  Database["public"]["Tables"]["billing_document_lines"]["Row"];
export type BillingSyncLog =
  Database["public"]["Tables"]["billing_sync_logs"]["Row"];

export const PROVIDER_LABELS: Record<BillingProvider, string> = {
  keyinvoice: "KeyInvoice",
  invoicexpress: "InvoiceXpress",
  moloni: "Moloni",
  vendus: "Vendus",
  manual_export: "Exportação Manual",
};

export const INTERNAL_STATUS_LABELS: Record<BillingInternalStatus, string> = {
  draft: "Rascunho",
  prepared: "Preparado",
  issued: "Emitido",
  paid: "Pago",
  partially_paid: "Parcialmente Pago",
  credited: "Creditado",
  cancelled: "Cancelado",
  error: "Erro",
};

export const DOCUMENT_TYPE_LABELS: Record<BillingDocumentType, string> = {
  invoice: "Fatura",
  credit_note: "Nota de Crédito",
  receipt: "Recibo",
  proforma: "Proforma",
};
