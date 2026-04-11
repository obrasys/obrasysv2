import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, ChevronRight, Clock, FileText, ClipboardList, Lightbulb } from 'lucide-react';
import type { Obra } from '@/types/obras';

interface DashboardPrioritiesProps {
  obras: Obra[];
  tarefasPendentes: number;
  rdosPendentes: number;
  medicoesPendentes: number;
}

const insights = [
  'Obras com RDOs diários têm 30% menos atrasos registados.',
  'Orçamentos detalhados reduzem desvios em até 25%.',
  'Equipas com tarefas atribuídas diariamente são 40% mais produtivas.',
  'Medições regulares evitam surpresas no fecho de obra.',
  'Manter o perfil da empresa completo transmite mais confiança aos clientes.',
];

function getDailyInsight() {
  const day = new Date().getDate();
  return insights[day % insights.length];
}

export function DashboardPriorities({ obras, tarefasPendentes, rdosPendentes, medicoesPendentes }: DashboardPrioritiesProps) {
  const navigate = useNavigate();

  const priorities: { label: string; icon: typeof Clock; href: string }[] = [];
  if (rdosPendentes > 0) priorities.push({ label: `Fechar ${rdosPendentes} RDO${rdosPendentes > 1 ? 's' : ''} pendente${rdosPendentes > 1 ? 's' : ''}`, icon: ClipboardList, href: '/rdos' });
  if (medicoesPendentes > 0) priorities.push({ label: `Aprovar ${medicoesPendentes} auto${medicoesPendentes > 1 ? 's' : ''} de medição`, icon: FileText, href: '/autos-medicao' });
  if (tarefasPendentes > 0) priorities.push({ label: `${tarefasPendentes} tarefa${tarefasPendentes > 1 ? 's' : ''} por concluir hoje`, icon: CheckCircle2, href: '/tarefas' });
  if (priorities.length === 0) priorities.push({ label: 'Sem prioridades urgentes hoje', icon: CheckCircle2, href: '/tarefas' });

  const alerts: { label: string; severity: 'high' | 'medium' | 'low' }[] = [];
  const obrasAtrasadas = obras.filter(o => o.status === 'em_curso' && o.data_fim && new Date(o.data_fim) < new Date());
  obrasAtrasadas.forEach(o => {
    const dias = Math.ceil((Date.now() - new Date(o.data_fim!).getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({ label: `${o.nome} com atraso de ${dias} dias`, severity: dias > 5 ? 'high' : 'medium' });
  });
  const obrasPausadas = obras.filter(o => o.status === 'pausada');
  obrasPausadas.forEach(o => alerts.push({ label: `${o.nome} está pausada`, severity: 'medium' }));

  const hasRealAlerts = alerts.length > 0;

  const severityColor = (s: string) => {
    if (s === 'high') return 'text-destructive';
    if (s === 'medium') return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Prioridades */}
      <Card className="rounded-xl shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Prioridades de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          {priorities.slice(0, 5).map((p, i) => (
            <button
              key={i}
              onClick={() => navigate(p.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <p.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground flex-1">{p.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => navigate('/tarefas')}>
            Ver todas
          </Button>
        </CardContent>
      </Card>

      {/* Alertas / Insights */}
      <Card className="rounded-xl shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {hasRealAlerts ? (
              <><AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas Importantes</>
            ) : (
              <><Lightbulb className="w-4 h-4 text-amber-500" /> Insight do Dia</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          {hasRealAlerts ? (
            <>
              {alerts.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${severityColor(a.severity)}`} />
                  <span className="text-sm text-foreground">{a.label}</span>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => navigate('/obras')}>
                Ver alertas
              </Button>
            </>
          ) : (
            <div className="flex items-start gap-3 px-3 py-4 rounded-lg bg-primary/5">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground font-medium">{getDailyInsight()}</p>
                <p className="text-xs text-muted-foreground">Sem alertas no momento — tudo a correr bem!</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
