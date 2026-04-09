import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Obra } from '@/types/obras';

interface DashboardAgendaPerformanceProps {
  obras: Obra[];
  tarefasPendentes: number;
}

export function DashboardAgendaPerformance({ obras, tarefasPendentes }: DashboardAgendaPerformanceProps) {
  const navigate = useNavigate();

  // Performance calculation
  const obrasAtivas = obras.filter(o => o.status === 'em_curso');
  const progressoMedio = obrasAtivas.length > 0
    ? Math.round(obrasAtivas.reduce((s, o) => s + (o.progresso || 0), 0) / obrasAtivas.length)
    : 0;
  const obrasAdiantadas = obrasAtivas.filter(o => o.data_fim && new Date(o.data_fim) >= new Date()).length;
  const obrasAtrasadas = obrasAtivas.filter(o => o.data_fim && new Date(o.data_fim) < new Date()).length;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Agenda */}
      <Card className="rounded-xl shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Agenda dos Próximos Dias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {tarefasPendentes > 0 ? (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Hoje</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{tarefasPendentes} tarefa{tarefasPendentes > 1 ? 's' : ''} pendente{tarefasPendentes > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              {obrasAtivas.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Esta Semana</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">Acompanhar {obrasAtivas.length} obra{obrasAtivas.length > 1 ? 's' : ''} ativa{obrasAtivas.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Agenda limpa por agora</p>
            </div>
          )}
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => navigate('/tarefas')}>
            Ver agenda completa <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Desempenho */}
      <Card className="rounded-xl shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Desempenho da Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30">
              <span className="text-sm text-foreground">Execução média</span>
              <span className="text-sm font-semibold text-foreground">{progressoMedio}%</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30">
              <span className="text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Obras dentro do prazo
              </span>
              <span className="text-sm font-semibold text-emerald-600">{obrasAdiantadas}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30">
              <span className="text-sm text-foreground flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                Obras atrasadas
              </span>
              <span className="text-sm font-semibold text-destructive">{obrasAtrasadas}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => navigate('/relatorios')}>
            Ver relatório semanal <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
