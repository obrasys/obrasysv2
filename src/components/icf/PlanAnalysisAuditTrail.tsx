/**
 * Fase 9 — Trilha de auditoria de uma planta (PDF/DXF).
 * Mostra os últimos 50 eventos de `plan_analysis_logs` para a planta
 * atual, com badges de severidade e detalhes opcionais.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { usePlanAnalysisAudit, type PlanAnalysisLogRow } from "@/hooks/usePlanAnalysisAudit";

interface Props {
  planImportId: string | null | undefined;
  className?: string;
}

const EVENT_LABEL: Record<string, string> = {
  analise_iniciada: "Análise iniciada",
  analise_concluida: "Análise concluída",
  analise_concluida_com_revisao: "Análise concluída — requer revisão",
  erro: "Erro na análise",
  erro_persistencia: "Erro ao persistir registos",
  dados_validados: "Registos ICF criados",
  revisao_humana_guardada: "Revisão humana guardada",
  orcamento_criado: "Orçamento criado a partir da planta",
  orcamento_atualizado: "Orçamento atualizado a partir da planta",
};

function statusVariant(s: PlanAnalysisLogRow["status"]) {
  switch (s) {
    case "success":
      return "secondary";
    case "warning":
      return "outline";
    case "error":
      return "destructive";
    default:
      return "default";
  }
}

const META_LABELS: Record<string, string> = {
  modelo: "Modelo",
  paredes: "Paredes detetadas",
  baixa_confianca: "Baixa confiança",
  possivel_contagem_dupla: "Possível contagem dupla",
  pisos: "Pisos",
  area_total: "Área total (m²)",
  perimetro_total: "Perímetro total (m)",
  duracao_ms: "Duração (ms)",
  tokens: "Tokens",
  orcamento_id: "Orçamento",
  utilizador: "Utilizador",
};

function formatMetaValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return v.toLocaleString("pt-PT");
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return `${v.length} item(s)`;
  return "—";
}

function buildMetaSummary(meta: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(meta)
    .filter(([k, v]) => META_LABELS[k] && v !== null && v !== undefined && typeof v !== "object")
    .map(([k, v]) => [META_LABELS[k], formatMetaValue(v)] as [string, string]);
}

export function PlanAnalysisAuditTrail({ planImportId, className }: Props) {
  const { data, isLoading, isError, error } = usePlanAnalysisAudit(planImportId);
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!planImportId) return null;

  const rows = data ?? [];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            Auditoria da análise
            <Badge variant="outline" className="ml-1 text-[10px]">
              {rows.length}
            </Badge>
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar histórico…
            </div>
          )}
          {isError && (
            <p className="text-xs text-destructive">
              Não foi possível carregar o histórico: {(error as Error)?.message}
            </p>
          )}
          {!isLoading && rows.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Sem eventos registados para esta planta.
            </p>
          )}
          <ul className="divide-y border rounded-md">
            {rows.map((r) => {
              const isOpen = expanded === r.id;
              const meta = (r.metadata ?? {}) as Record<string, unknown>;
              const summary = buildMetaSummary(meta);
              const hasSummary = summary.length > 0;
              return (
                <li key={r.id} className="text-xs">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/40 flex items-start gap-2"
                    onClick={() => hasSummary && setExpanded(isOpen ? null : r.id)}
                  >
                    <Badge variant={statusVariant(r.status)} className="text-[10px] mt-0.5">
                      {r.status}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {EVENT_LABEL[r.event_type] ?? r.event_type}
                      </div>
                      {r.message && (
                        <div className="text-muted-foreground truncate">{r.message}</div>
                      )}
                    </div>
                    <div className="text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("pt-PT")}
                    </div>
                  </button>
                  {isOpen && hasSummary && (
                    <dl className="px-3 pb-3 grid grid-cols-[max-content,1fr] gap-x-3 gap-y-1 text-[11px]">
                      {summary.map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="font-medium break-words">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
