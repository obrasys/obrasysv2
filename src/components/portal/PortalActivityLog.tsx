import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Eye, Download, Camera, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface LogEntry {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  occurred_at: string;
}

interface PortalActivityLogProps {
  logs: LogEntry[];
}

const eventLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  portal_open: { label: 'Acedeu ao portal', icon: <LogIn className="h-4 w-4 text-primary" /> },
  rdo_open: { label: 'Visualizou RDO', icon: <Eye className="h-4 w-4 text-blue-500" /> },
  rdo_download: { label: 'Descarregou RDO (PDF)', icon: <Download className="h-4 w-4 text-green-600" /> },
  photo_open: { label: 'Visualizou fotografia', icon: <Camera className="h-4 w-4 text-purple-500" /> },
  album_open: { label: 'Abriu álbum de fotos', icon: <Camera className="h-4 w-4 text-purple-500" /> },
};

export function PortalActivityLog({ logs }: PortalActivityLogProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          A minha atividade
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem atividade registada.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const evt = eventLabels[log.event_type] || {
                label: log.event_type,
                icon: <Activity className="h-4 w-4 text-muted-foreground" />,
              };
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50"
                >
                  {evt.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{evt.label}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {format(new Date(log.occurred_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
