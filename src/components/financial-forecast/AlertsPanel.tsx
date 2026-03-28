import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinancialAlerts } from '@/hooks/useFinancialMilestones';
import { ALERT_SEVERITY_LABELS } from '@/types/financial-milestones';
import { AlertTriangle, Info, Bell, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  obraId: string;
}

export function AlertsPanel({ obraId }: Props) {
  const { alerts, isLoading, acknowledgeAlert, openAlerts, criticalAlerts } = useFinancialAlerts(obraId);

  const severityIcons: Record<string, React.ReactNode> = {
    info: <Info className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    critical: <Bell className="h-4 w-4 text-red-500" />,
  };

  const severityColors: Record<string, string> = {
    info: 'border-blue-200 bg-blue-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
    critical: 'border-red-200 bg-red-50/50',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas Financeiros
            {openAlerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">{openAlerts.length}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">A carregar...</p>
        ) : !alerts?.length ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="text-sm">Sem alertas financeiros.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${severityColors[alert.severity]} ${alert.status !== 'open' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {severityIcons[alert.severity]}
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(alert.detected_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  {alert.status === 'open' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => acknowledgeAlert.mutate(alert.id)}
                    >
                      Reconhecer
                    </Button>
                  )}
                  {alert.status !== 'open' && (
                    <Badge variant="outline" className="text-[10px]">
                      {alert.status === 'acknowledged' ? 'Reconhecido' : 'Resolvido'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
