import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  X,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  Copy,
  ShieldAlert,
  Unlink,
} from "lucide-react";
import type { PlanSuggestion } from "@/hooks/useAxiaPlanSuggestions";

interface Props {
  suggestions: PlanSuggestion[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof Plus; label: string }> = {
  add_complementary: { icon: Plus, label: "Complementar" },
  unit_mismatch: { icon: ArrowRightLeft, label: "Unidade" },
  duplicate_zone: { icon: Copy, label: "Duplicado" },
  value_incoherence: { icon: ShieldAlert, label: "Incoerência" },
  missing_mapping: { icon: Unlink, label: "Sem mapeamento" },
};

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

export function AxiaPlanSuggestionsPanel({ suggestions, loading, error, onRefresh, onDismiss }: Props) {
  const visible = suggestions.filter((s) => !s.dismissed);

  return (
    <Card className="border-[hsl(var(--axia-primary,187_100%_31%))] border-opacity-30 bg-[hsl(187_100%_31%/0.04)]">
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[hsl(187_100%_31%/0.12)]">
              <Lightbulb className="h-4 w-4 text-[#00679d]" />
            </div>
            <span className="text-sm font-semibold text-[#00679d]">Axia™ — Sugestões</span>
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            A analisar medições...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visible.length === 0 && suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            Clique em atualizar para obter sugestões da Axia™.
          </p>
        )}

        {!loading && !error && visible.length === 0 && suggestions.length > 0 && (
          <p className="text-xs text-muted-foreground py-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Todas as sugestões foram revistas.
          </p>
        )}

        {/* Suggestions */}
        {visible.map((s) => {
          const typeConfig = TYPE_CONFIG[s.type] || TYPE_CONFIG.missing_mapping;
          const TypeIcon = typeConfig.icon;
          const SeverityIcon = SEVERITY_ICON[s.severity] || Info;

          return (
            <div
              key={s.id}
              className={`rounded-lg border p-3 space-y-1.5 ${SEVERITY_STYLES[s.severity] || SEVERITY_STYLES.info}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <SeverityIcon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      s.severity === "error"
                        ? "text-destructive"
                        : s.severity === "warning"
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs font-semibold text-foreground">{s.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[9px] h-4 gap-0.5 px-1">
                    <TypeIcon className="h-2.5 w-2.5" />
                    {typeConfig.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => onDismiss(s.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-foreground/70 leading-snug">{s.message}</p>
              {s.suggested_article && (
                <p className="text-[10px] text-muted-foreground">
                  Artigo sugerido: <span className="font-mono">{s.suggested_article}</span>
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
