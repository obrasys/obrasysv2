import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown, Info, RefreshCw,
} from "lucide-react";
import { useBudgetInsights, type BudgetInsight } from "@/hooks/useBudgetInsights";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

const ICONS: Record<BudgetInsight["type"], any> = {
  deviation: TrendingUp,
  risk: AlertTriangle,
  opportunity: TrendingDown,
  info: Info,
};

const TONE: Record<BudgetInsight["severity"], string> = {
  low: "border-l-blue-400 bg-blue-50/50",
  medium: "border-l-amber-400 bg-amber-50/50",
  high: "border-l-rose-500 bg-rose-50/50",
};

export function BudgetInsightsPanel({ orcamentoId }: { orcamentoId: string }) {
  const [enabled, setEnabled] = useState(true);
  const { data, isLoading, isFetching, refetch, error } = useBudgetInsights(
    orcamentoId,
    enabled,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Axia · Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Análise proativa do estado económico (Base vs Objetivo vs Real).
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setEnabled(true); refetch(); }}
          disabled={isFetching}
          className="gap-2"
        >
          {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Não foi possível obter insights: {(error as Error).message}
          </p>
        ) : !data || !data.totals ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados suficientes para gerar insights.
          </p>
        ) : (
          <>
            {data.summary && (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
                {data.summary}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Base" value={fmt(data.totals.base ?? 0)} />
              <Stat label="Objetivo" value={fmt(data.totals.target ?? 0)} />
              <Stat
                label="Desvio"
                value={`${fmt(data.totals.variance ?? 0)} (${(data.totals.variancePct ?? 0).toFixed(1)}%)`}
                negative={(data.totals.variance ?? 0) > 0}
                positive={(data.totals.variance ?? 0) < 0}
              />
              <Stat label="Consumido" value={`${(data.totals.consumedPct ?? 0).toFixed(0)}%`} />
            </div>

            {data.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sem alertas relevantes neste momento.
              </p>
            ) : (
              <div className="space-y-2">
                {data.insights.map((ins, i) => {
                  const Icon = ICONS[ins.type] ?? Info;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 border-l-4 rounded-md ${TONE[ins.severity]}`}
                    >
                      <Icon className="h-4 w-4 mt-0.5 text-foreground/70" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{ins.title}</p>
                          {ins.metric && (
                            <Badge variant="outline" className="text-xs">{ins.metric}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{ins.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {data.topDeviations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Top desvios por item
                </p>
                <div className="space-y-1.5">
                  {data.topDeviations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm border-b pb-1.5">
                      <div className="min-w-0 mr-2">
                        <p className="truncate">{d.description}</p>
                        {d.chapter && (
                          <p className="text-xs text-muted-foreground truncate">{d.chapter}</p>
                        )}
                      </div>
                      <span
                        className={`tabular-nums font-medium text-sm ${d.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {d.delta > 0 ? "+" : ""}{fmt(d.delta)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label, value, positive, negative,
}: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${negative ? "text-rose-600" : positive ? "text-emerald-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
