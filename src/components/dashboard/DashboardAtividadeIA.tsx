import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles, Zap, FileText, BarChart3 } from 'lucide-react';
import { useDashboardAlerts } from '@/hooks/useAxiaVoiceIntake';
import { Link } from 'react-router-dom';

const ACTIVITY_ICONS: Record<string, typeof Sparkles> = {
  extraction: Zap,
  comparison: BarChart3,
  proposal: FileText,
  system: Sparkles,
};

const ACTIVITY_COLORS: Record<string, string> = {
  extraction: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  comparison: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  proposal: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  system: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
};

const ACTIVITY_LABELS: Record<string, string> = {
  extraction: 'AXIA',
  comparison: 'AXIA',
  proposal: 'SISTEMA',
  system: 'SISTEMA',
};

const ACTIVITY_ACTORS: Record<string, string> = {
  extraction: 'Axia',
  comparison: 'Axia',
  proposal: 'Axia',
  system: 'Axia',
};

export function DashboardAtividadeIA() {
  const { data: alerts } = useDashboardAlerts();

  const activities = (alerts || []).slice(0, 5).map((a) => ({
    id: a.id,
    time: new Date(a.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    type: a.severity === 'critical' ? 'system' : a.severity === 'warning' ? 'comparison' : 'extraction',
    title: a.title,
    description: a.message,
  }));

  return (
    <Card className="rounded-xl border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Atividade IA</h3>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold tracking-wide border-primary/30 text-primary bg-primary/5">
          TEMPO REAL
        </Badge>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Últimas 4 horas</p>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type] || Sparkles;
            const label = ACTIVITY_LABELS[activity.type] || 'SISTEMA';
            const actor = ACTIVITY_ACTORS[activity.type] || 'Axia';
            const colorClass = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.system;

            return (
              <div key={activity.id} className="flex gap-3 group">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{activity.time}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pb-3 border-b border-border/20 group-last:border-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                    <span className="w-1 h-1 rounded-full bg-primary/60" />
                    <span className="text-[10px] text-muted-foreground">{actor}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug">{activity.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-line">{activity.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <Button asChild variant="ghost" size="sm" className="w-full mt-3 text-xs">
          <Link to="/axia/inbox">Ver histórico completo</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
