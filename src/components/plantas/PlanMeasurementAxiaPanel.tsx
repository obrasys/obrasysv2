import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlanMeasurement } from "@/types/plan-measurements";
import { analyzePlanMeasurement } from "@/lib/plan-axia-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, AlertCircle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  measurement: PlanMeasurement;
  /** When provided, the panel will auto-persist freshly computed status/notes if they differ from the DB row */
  autoPersist?: boolean;
}

const SEVERITY_ICON = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_TONE = {
  error: "text-destructive",
  warning: "text-amber-600",
  info: "text-muted-foreground",
};

export function PlanMeasurementAxiaPanel({ measurement, autoPersist = true }: Props) {
  const queryClient = useQueryClient();
  const result = useMemo(() => analyzePlanMeasurement(measurement), [measurement]);

  const persist = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("plan_measurements")
        .update({ axia_status: result.status, axia_notes: result.notes as any } as any)
        .eq("id", measurement.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-measurements", measurement.plan_import_id] });
    },
    onError: (e: Error) => toast.error("Axia: " + e.message),
  });

  // Auto-persist if status changed
  useEffect(() => {
    if (!autoPersist) return;
    const dbStatus = measurement.axia_status ?? "not_analyzed";
    const dbNotesLen = (measurement.axia_notes ?? []).length;
    if (dbStatus !== result.status || dbNotesLen !== result.notes.length) {
      persist.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurement.id, result.status, result.notes.length]);

  const statusBadge = () => {
    if (result.status === "valid") return <Badge className="bg-emerald-600 text-white text-[10px] h-4"><CheckCircle2 className="w-3 h-3 mr-0.5" />Válida</Badge>;
    if (result.status === "warning") return <Badge className="bg-amber-500 text-white text-[10px] h-4">Aviso</Badge>;
    if (result.status === "error") return <Badge variant="destructive" className="text-[10px] h-4">Erro</Badge>;
    return <Badge variant="secondary" className="text-[10px] h-4">A analisar…</Badge>;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Análise Axia™
          {statusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1.5">
          {result.notes.map((n, i) => {
            const Icon = SEVERITY_ICON[n.severity] ?? Info;
            return (
              <li key={i} className="text-xs flex items-start gap-2">
                <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${SEVERITY_TONE[n.severity]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium">{n.message}</p>
                  {n.explanation && <p className="text-[11px] text-muted-foreground mt-0.5">{n.explanation}</p>}
                  {n.suggested_action && (
                    <p className="text-[11px] text-primary mt-0.5">→ {n.suggested_action}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[11px]"
          onClick={() => persist.mutate()}
          disabled={persist.isPending}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${persist.isPending ? "animate-spin" : ""}`} />
          Reanalisar
        </Button>
      </CardContent>
    </Card>
  );
}

/** Aggregated summary of all measurements' Axia status. */
export function PlanAxiaSummaryStrip({ measurements }: { measurements: PlanMeasurement[] }) {
  const counts = useMemo(() => {
    let valid = 0, warning = 0, error = 0, pending = 0;
    for (const m of measurements) {
      if (!m.action_type) continue; // only structured measurements count
      const s = m.axia_status ?? "not_analyzed";
      if (s === "valid") valid++;
      else if (s === "warning") warning++;
      else if (s === "error") error++;
      else pending++;
    }
    return { valid, warning, error, pending };
  }, [measurements]);

  const total = counts.valid + counts.warning + counts.error + counts.pending;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-primary/5 rounded-md text-[11px]">
      <Brain className="w-3.5 h-3.5 text-primary" />
      <span className="text-emerald-600 font-medium">{counts.valid} válidas</span>
      {counts.warning > 0 && <span className="text-amber-600 font-medium">{counts.warning} aviso{counts.warning > 1 ? "s" : ""}</span>}
      {counts.error > 0 && <span className="text-destructive font-medium">{counts.error} erro{counts.error > 1 ? "s" : ""}</span>}
      {counts.pending > 0 && <span className="text-muted-foreground">{counts.pending} pendente{counts.pending > 1 ? "s" : ""}</span>}
    </div>
  );
}
