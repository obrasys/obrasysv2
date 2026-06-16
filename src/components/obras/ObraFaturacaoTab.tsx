import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Settings } from "lucide-react";
import { BillingDocumentsList } from "@/modules/billing/components/BillingDocumentsList";
import { BillingSyncLogsPanel } from "@/modules/billing/components/BillingSyncLogsPanel";
import { useBillingIntegrations } from "@/modules/billing/hooks/useBillingIntegrations";

export function ObraFaturacaoTab({ obraId }: { obraId: string }) {
  const { data: integrations } = useBillingIntegrations();
  const hasActive = (integrations ?? []).some((i) => i.is_active);

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          O Obra Sys <b>não emite faturação fiscal própria</b>. A emissão é efetuada pelo
          provider externo configurado nas Definições da Empresa.
        </AlertDescription>
      </Alert>

      {!hasActive && (
        <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
          <span className="text-sm text-muted-foreground">
            Não existe integração de faturação ativa.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to="/empresa/definicoes/faturacao">
              <Settings className="h-4 w-4 mr-2" /> Configurar
            </Link>
          </Button>
        </div>
      )}

      <BillingDocumentsList obraId={obraId} />
      <BillingSyncLogsPanel />
    </div>
  );
}
