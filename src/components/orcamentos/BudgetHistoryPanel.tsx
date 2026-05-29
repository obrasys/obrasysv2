import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, CheckCircle2, Lock, GitBranch, FileCheck2, Target, Package, ShoppingCart, Gavel, FilePlus2, Send } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useBudgetEvents } from "@/hooks/useBudgetEvents";

interface Props {
  orcamentoId: string;
}

const EVENT_META: Record<string, { label: string; icon: any; cls: string }> = {
  budget_created: { label: "Orçamento criado", icon: FilePlus2, cls: "text-blue-600 bg-blue-50" },
  budget_submitted_for_review: { label: "Submetido para revisão", icon: Send, cls: "text-blue-600 bg-blue-50" },
  budget_approved: { label: "Orçamento aprovado", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  budget_locked: { label: "Versão bloqueada", icon: Lock, cls: "text-amber-700 bg-amber-50" },
  initial_closing_sheet_created: { label: "Folha de Fecho Inicial criada", icon: FileCheck2, cls: "text-blue-600 bg-blue-50" },
  target_budget_created: { label: "Budget Objetivo criado", icon: Target, cls: "text-primary bg-primary/10" },
  target_budget_version_created: { label: "Nova versão do Budget Objetivo", icon: GitBranch, cls: "text-primary bg-primary/10" },
  target_budget_superseded: { label: "Versão substituída", icon: GitBranch, cls: "text-muted-foreground bg-muted" },
  target_budget_activated: { label: "Versão ativada", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  package_created: { label: "Pacote de contratação criado", icon: Package, cls: "text-purple-600 bg-purple-50" },
  quote_received: { label: "Cotação recebida", icon: FileCheck2, cls: "text-blue-600 bg-blue-50" },
  package_awarded: { label: "Pacote adjudicado", icon: Gavel, cls: "text-emerald-700 bg-emerald-50" },
  award_confirmed: { label: "Adjudicação confirmada", icon: Gavel, cls: "text-emerald-700 bg-emerald-50" },
  purchase_registered: { label: "Compra registada", icon: ShoppingCart, cls: "text-blue-700 bg-blue-50" },
  variance_recalculated: { label: "Variação recalculada", icon: GitBranch, cls: "text-muted-foreground bg-muted" },
  final_closing_sheet_created: { label: "Folha de Fecho Final criada", icon: FileCheck2, cls: "text-amber-700 bg-amber-50" },
  final_closing_sheet_locked: { label: "Folha de Fecho Final bloqueada", icon: Lock, cls: "text-amber-800 bg-amber-50" },
};

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

function summarizeEvent(eventType: string, payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const parts: string[] = [];
  const push = (label: string, value: any) => {
    if (value === null || value === undefined || value === "") return;
    parts.push(`${label}: ${value}`);
  };
  switch (eventType) {
    case "purchase_registered":
      push("Fatura", payload.invoice_number);
      if (typeof payload.total_amount === "number") push("Total", fmtEUR(payload.total_amount));
      break;
    case "package_awarded":
    case "award_confirmed":
      if (typeof payload.awarded_total === "number") push("Adjudicado", fmtEUR(payload.awarded_total));
      if (typeof payload.estimated_total === "number") push("Estimado", fmtEUR(payload.estimated_total));
      break;
    case "package_created":
      push("Nome", payload.name);
      if (typeof payload.items === "number") push("Itens", payload.items);
      if (typeof payload.estimated_total === "number") push("Estimado", fmtEUR(payload.estimated_total));
      break;
    case "quote_received":
      push("Fornecedor", payload.supplier_name);
      if (typeof payload.total === "number") push("Total", fmtEUR(payload.total));
      break;
    default:
      if (payload.name) push("Nome", payload.name);
      if (payload.title) push("Título", payload.title);
      if (typeof payload.total === "number") push("Total", fmtEUR(payload.total));
  }
  return parts.length ? parts.join(" · ") : null;
}

export function BudgetHistoryPanel({ orcamentoId }: Props) {
  const { data: events = [], isLoading } = useBudgetEvents(orcamentoId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Histórico Económico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem eventos registados.
          </p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-4">
            {events.map((e) => {
              const meta = EVENT_META[e.event_type] ?? {
                label: e.event_type,
                icon: History,
                cls: "text-muted-foreground bg-muted",
              };
              const Icon = meta.icon;
              return (
                <li key={e.id} className="ml-6">
                  <span
                    className={`absolute -left-3 flex items-center justify-center h-6 w-6 rounded-full ring-4 ring-background ${meta.cls}`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{meta.label}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {format(new Date(e.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                    </Badge>
                  </div>
                  {e.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {e.description}
                    </p>
                  )}
                  {(() => {
                    const summary = summarizeEvent(e.event_type, e.new_value);
                    return summary ? (
                      <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{summary}</p>
                    ) : null;
                  })()}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
