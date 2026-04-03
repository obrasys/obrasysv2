import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  X,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import type { CrossValidationAlert } from "@/hooks/useAxiaCrossValidation";

interface Props {
  alerts: CrossValidationAlert[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  error: "border-destructive/40 bg-destructive/5",
  warning: "border-amber-400/40 bg-amber-50 dark:bg-amber-950/20",
  info: "border-border bg-muted/30",
};

const SEVERITY_ICON: Record<string, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function PlanCrossValidationPanel({ alerts, loading, error, onRefresh, onDismiss }: Props) {
  const visible = alerts.filter((a) => !a.dismissed);

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">Validação Cruzada</span>
            {visible.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {visible.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            A comparar com histórico...
          </div>
        )}

        {error && !loading && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
            {error}
          </div>
        )}

        {!loading && !error && visible.length === 0 && alerts.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            Clique em atualizar para comparar com orçamentos anteriores.
          </p>
        )}

        {!loading && !error && visible.length === 0 && alerts.length > 0 && (
          <p className="text-xs text-muted-foreground py-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Todos os alertas foram revistos.
          </p>
        )}

        {visible.map((a) => {
          const SeverityIcon = SEVERITY_ICON[a.severity] || Info;
          const MetricIcon = a.metric.includes("price") ? TrendingUp : BarChart3;

          return (
            <div
              key={a.id}
              className={`rounded-lg border p-3 space-y-1.5 ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <SeverityIcon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      a.severity === "error"
                        ? "text-destructive"
                        : a.severity === "warning"
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs font-semibold text-foreground">{a.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={() => onDismiss(a.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-foreground/70 leading-snug">{a.message}</p>
              {a.deviation_percent !== 0 && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MetricIcon className="h-3 w-3" />
                  Desvio: {a.deviation_percent > 0 ? "+" : ""}
                  {a.deviation_percent.toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
