import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Clock } from 'lucide-react';
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progresso da Obra
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progresso geral</span>
            <span className="text-2xl font-bold text-primary">{Math.round(progresso)}%</span>
          </div>
          <Progress value={progresso} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Última atualização: {format(new Date(updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
          </p>
        </div>

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-sm font-medium text-foreground">Marcos da obra</p>
            {milestones.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{m.descricao}</span>
                  <span className="text-muted-foreground">
                    {m.quantidade_executada}/{m.quantidade_prevista} {m.unidade}
                  </span>
                </div>
                <Progress value={m.percentagem} className="h-1.5" />
              </div>
            ))}
          </div>
        )}

        {milestones.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ainda não existem marcos registados.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
