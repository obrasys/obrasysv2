import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ScrollText } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useBillingSyncLogs } from "../hooks/useBillingDocuments";

export function BillingSyncLogsPanel({ documentId }: { documentId?: string }) {
  const { data: logs } = useBillingSyncLogs(documentId);

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ScrollText className="h-4 w-4" />
        Histórico de chamadas ({logs?.length ?? 0})
        <ChevronDown className="h-3.5 w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Card>
          <CardContent className="p-3 space-y-2 max-h-[300px] overflow-auto">
            {(logs ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sem registos.
              </p>
            )}
            {(logs ?? []).map((l: any) => (
              <div
                key={l.id}
                className="text-xs border rounded-md p-2 flex items-start justify-between gap-2"
              >
                <div>
                  <div className="font-mono">{l.operation}</div>
                  <div className="text-muted-foreground">
                    {format(new Date(l.created_at), "dd/MM HH:mm:ss")} ·{" "}
                    {l.http_status ?? "—"} · {l.duration_ms ?? 0}ms
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    l.status === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : l.status === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-muted"
                  }
                >
                  {l.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
