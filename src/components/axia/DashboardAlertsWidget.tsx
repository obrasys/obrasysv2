import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Inbox, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardAlerts, useDismissAlert } from "@/hooks/useAxiaVoiceIntake";

const SEVERITY_STYLE: Record<string, string> = {
  info: "border-primary/30 bg-primary/5",
  warning: "border-yellow-500/40 bg-yellow-500/5",
  critical: "border-destructive/40 bg-destructive/5",
};

export function DashboardAlertsWidget() {
  const { data: alerts, isLoading } = useDashboardAlerts();
  const dismiss = useDismissAlert();

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Pendências Axia</h3>
          {alerts && alerts.length > 0 && (
            <Badge variant="secondary">{alerts.length}</Badge>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/axia/inbox">Ver tudo</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar...</p>
      ) : !alerts || alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <Inbox className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Sem pendências da Axia.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((a) => (
            <div
              key={a.id}
              className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${SEVERITY_STYLE[a.severity] ?? ""}`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {a.action_url && a.action_label && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={a.action_url}>{a.action_label}</Link>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => dismiss.mutate(a.id)}
                  title="Dispensar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default DashboardAlertsWidget;
