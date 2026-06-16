import { AppLayout } from "@/components/layout";
import { BillingIntegrationSettings } from "@/modules/billing/components/BillingIntegrationSettings";
import { BillingSyncLogsPanel } from "@/modules/billing/components/BillingSyncLogsPanel";

export default function FaturacaoEmpresa() {
  return (
    <AppLayout title="Faturação — Integrações">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <BillingIntegrationSettings />
        <BillingSyncLogsPanel />
      </div>
    </AppLayout>
  );
}
