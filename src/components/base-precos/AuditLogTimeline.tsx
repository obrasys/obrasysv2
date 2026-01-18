import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceAuditLog, AuditAction } from "@/types/base-precos";

interface AuditLogTimelineProps {
  logs: PriceAuditLog[];
}

const actionConfig: Record<
  AuditAction,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  recalculated: {
    label: "Preço recalculado",
    icon: RefreshCw,
    color: "text-blue-500",
  },
  price_accepted: {
    label: "Preço aceite",
    icon: CheckCircle,
    color: "text-green-500",
  },
  price_rejected: {
    label: "Preço rejeitado",
    icon: XCircle,
    color: "text-red-500",
  },
  price_penalized: {
    label: "Preço penalizado",
    icon: AlertTriangle,
    color: "text-yellow-500",
  },
  price_inserted: {
    label: "Preço inserido",
    icon: Plus,
    color: "text-purple-500",
  },
};

export function AuditLogTimeline({ logs }: AuditLogTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum registo de auditoria.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const config = actionConfig[log.acao];
        const Icon = config.icon;

        return (
          <div key={log.id} className="flex gap-4">
            {/* Linha do tempo */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center bg-muted",
                  config.color
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              {index < logs.length - 1 && (
                <div className="w-px h-full bg-border flex-1 my-2" />
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{config.label}</h4>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                    locale: pt,
                  })}
                </span>
              </div>

              {log.material && (
                <p className="text-sm text-muted-foreground mt-1">
                  Material: {log.material.nome}
                </p>
              )}

              {log.region && (
                <p className="text-sm text-muted-foreground">
                  Região: {log.region.nome}
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                Executado por: {log.executado_por}
              </p>

              {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    Ver detalhes
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(log.detalhes, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
