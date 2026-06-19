import { Plug, CreditCard, FileText, Database, Webhook, Code } from "lucide-react";
import { SectionCard } from "@/components/patterns";

const integrations = [
  { name: "Stripe", description: "Pagamentos e subscrições", icon: CreditCard, status: "Ativa" },
  { name: "Base de dados", description: "Backend gerido (cloud do ObraSys)", icon: Database, status: "Ativa" },
  { name: "KeyInvoice", description: "Faturação certificada", icon: FileText, status: "Em breve" },
  { name: "InvoiceXpress", description: "Faturação certificada", icon: FileText, status: "Em breve" },
  { name: "Moloni", description: "Faturação certificada", icon: FileText, status: "Em breve" },
  { name: "Vendus", description: "Faturação POS", icon: FileText, status: "Em breve" },
  { name: "Primavera", description: "ERP empresarial", icon: FileText, status: "Em breve" },
  { name: "Webhooks", description: "Notificações para sistemas externos", icon: Webhook, status: "Em breve" },
  { name: "API externa", description: "Chaves e tokens para integrações personalizadas", icon: Code, status: "Em breve" },
];

export default function DefinicoesIntegracoes() {
  return (
    <SectionCard
      title="Integrações disponíveis"
      description="Liga o Obra Sys aos teus sistemas de faturação, pagamentos e automação."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {integrations.map((i) => (
          <div
            key={i.name}
            className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-elevated p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <i.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-strong">{i.name}</p>
              <p className="text-xs text-text-muted">{i.description}</p>
            </div>
            <span
              className={
                i.status === "Ativa"
                  ? "rounded-full bg-[hsl(var(--success))]/10 px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--success))]"
                  : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-text-muted"
              }
            >
              {i.status}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
