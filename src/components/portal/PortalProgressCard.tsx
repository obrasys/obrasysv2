import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface PortalProgressCardProps {
  progresso: number;
  updatedAt: string;
  milestones: Array<{
    id: string;
    descricao: string;
    percentagem: number;
    quantidade_prevista: number;
    quantidade_executada: number;
    unidade: string;
    updated_at: string;
  }>;
}

export function PortalProgressCard({ progresso, updatedAt, milestones }: PortalProgressCardProps) {
  const progressValue = Math.round(progresso);

  return (
    <div className="space-y-4">
      {/* Main progress */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Progresso Geral</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Atualizado {format(new Date(updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                </p>
              </div>
            </div>
            <span className="text-3xl font-bold text-primary">{progressValue}%</span>
          </div>

          <Progress value={progressValue} className="h-3 rounded-full" />

          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0%</span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      {milestones.length > 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Marcos da Obra</h3>
            <div className="space-y-3">
              {milestones.map((m) => {
                const pct = Math.round(m.percentagem);
                const isComplete = pct >= 100;

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isComplete ? 'bg-green-50 border-green-200' : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground">{m.descricao}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${isComplete ? 'bg-green-100 text-green-700' : ''}`}
                      >
                        {pct}%
                      </Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {m.quantidade_executada}/{m.quantidade_prevista} {m.unidade}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="py-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Ainda não existem marcos registados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}