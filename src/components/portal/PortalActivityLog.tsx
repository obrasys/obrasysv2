import { Card, CardContent } from '@/components/ui/card';
import { Activity, Eye, Download, Camera, LogIn } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
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

const eventConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  portal_open: {
    label: 'Acedeu ao portal',
    icon: <LogIn className="h-3.5 w-3.5" />,
    color: 'bg-primary/10 text-primary',
  },
  rdo_open: {
    label: 'Visualizou relatório',
    icon: <Eye className="h-3.5 w-3.5" />,
    color: 'bg-blue-100 text-blue-600',
  },
  rdo_download: {
    label: 'Descarregou relatório (PDF)',
    icon: <Download className="h-3.5 w-3.5" />,
    color: 'bg-green-100 text-green-600',
  },
  photo_open: {
    label: 'Visualizou fotografia',
    icon: <Camera className="h-3.5 w-3.5" />,
    color: 'bg-purple-100 text-purple-600',
  },
  album_open: {
    label: 'Abriu álbum de fotos',
    icon: <Camera className="h-3.5 w-3.5" />,
    color: 'bg-purple-100 text-purple-600',
  },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "d 'de' MMMM", { locale: pt });
}

export function PortalActivityLog({ logs }: PortalActivityLogProps) {
  if (logs.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-10 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Activity className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Sem atividade registada.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const grouped = logs.reduce<Record<string, LogEntry[]>>((acc, log) => {
    const key = format(new Date(log.occurred_at), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([dateKey, entries]) => (
          <Card key={dateKey} className="border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {formatRelativeDate(entries[0].occurred_at)}
              </p>
              <div className="space-y-1">
                {entries.map((log) => {
                  const config = eventConfig[log.event_type] || {
                    label: log.event_type,
                    icon: <Activity className="h-3.5 w-3.5" />,
                    color: 'bg-muted text-muted-foreground',
                  };
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                        {config.icon}
                      </div>
                      <p className="text-sm text-foreground flex-1">{config.label}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(log.occurred_at), 'HH:mm')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}