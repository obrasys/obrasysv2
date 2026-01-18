import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  ClipboardList,
  ChevronRight,
  Bell,
  CheckCircle,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useObraAlerts, ObraAlert } from '@/hooks/useObraAlerts';

interface ObraAlertsPanelProps {
  maxAlerts?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export function ObraAlertsPanel({ 
  maxAlerts = 5, 
  showHeader = true,
  compact = false 
}: ObraAlertsPanelProps) {
  const navigate = useNavigate();
  const { alerts, isLoading, errorCount, warningCount, hasAlerts } = useObraAlerts();

  const getAlertIcon = (alert: ObraAlert) => {
    switch (alert.type) {
      case 'missing_rdo':
        return <Clock className="w-4 h-4" />;
      case 'no_rdo_ever':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending_approval':
        return <ClipboardList className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertAction = (alert: ObraAlert) => {
    switch (alert.type) {
      case 'missing_rdo':
      case 'no_rdo_ever':
        return () => navigate(`/rdos/criar?obra=${alert.obraId}`);
      case 'pending_approval':
        return () => navigate(`/rdos?obra=${alert.obraId}&status=submetido`);
      default:
        return () => navigate(`/obras/${alert.obraId}`);
    }
  };

  const getActionLabel = (alert: ObraAlert) => {
    switch (alert.type) {
      case 'missing_rdo':
      case 'no_rdo_ever':
        return 'Criar RDO';
      case 'pending_approval':
        return 'Ver RDOs';
      default:
        return 'Ver Obra';
    }
  };

  if (isLoading) {
    return null;
  }

  if (!hasAlerts) {
    if (!showHeader) return null;
    
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">Tudo em dia!</p>
            <p className="text-sm text-green-600">Todas as obras ativas têm RDOs recentes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedAlerts = alerts.slice(0, maxAlerts);
  const remainingAlerts = alerts.length - maxAlerts;

  if (compact) {
    return (
      <div className="space-y-2">
        {displayedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
              alert.severity === 'error'
                ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                : 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
            }`}
            onClick={getAlertAction(alert)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={alert.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}>
                {getAlertIcon(alert)}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${
                  alert.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {alert.obraNome}
                </p>
                <p className={`text-xs truncate ${
                  alert.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {alert.message}
                </p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 ${
              alert.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
            }`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-lg">Alertas de Acompanhamento</span>
            </div>
            <div className="flex gap-2">
              {errorCount > 0 && (
                <Badge variant="destructive" className="bg-red-500">
                  {errorCount} crítico{errorCount > 1 ? 's' : ''}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  {warningCount} aviso{warningCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {displayedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-lg border transition-all hover:shadow-sm ${
              alert.severity === 'error'
                ? 'bg-red-50 border-red-200 hover:border-red-300'
                : 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  alert.severity === 'error' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <span className={alert.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}>
                    {getAlertIcon(alert)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className={`font-medium ${
                    alert.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {alert.obraNome}
                  </p>
                  {alert.obraCliente && (
                    <p className={`text-sm ${
                      alert.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {alert.obraCliente}
                    </p>
                  )}
                  <p className={`text-sm mt-1 ${
                    alert.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {alert.message}
                    {alert.lastRdoDate && (
                      <span className="opacity-75"> • Último: {alert.lastRdoDate}</span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={alert.severity === 'error' ? 'destructive' : 'outline'}
                className={alert.severity === 'warning' ? 'border-yellow-400 text-yellow-800 hover:bg-yellow-100' : ''}
                onClick={getAlertAction(alert)}
              >
                {getActionLabel(alert)}
              </Button>
            </div>
          </div>
        ))}

        {remainingAlerts > 0 && (
          <Button
            variant="ghost"
            className="w-full text-amber-700 hover:text-amber-800 hover:bg-amber-100"
            onClick={() => navigate('/obras?status=em_curso')}
          >
            Ver mais {remainingAlerts} alerta{remainingAlerts > 1 ? 's' : ''}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
