import { History } from "lucide-react";
import { SectionCard, EmptyState } from "@/components/patterns";

export default function DefinicoesAuditoria() {
  return (
    <SectionCard
      title="Auditoria e histórico"
      description="Registo de ações críticas: login, alterações de permissões, orçamentos, Budget/Forecast, exportações, eliminações e ações Axia."
    >
      <EmptyState
        icon={History}
        title="Histórico ainda não disponível"
        description="Os eventos de auditoria começarão a aparecer aqui assim que a recolha estiver ativa para a tua organização."
      />
    </SectionCard>
  );
}
