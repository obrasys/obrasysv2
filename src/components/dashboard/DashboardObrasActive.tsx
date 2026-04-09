import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, ChevronRight, Users, ArrowRight } from 'lucide-react';
import type { Obra } from '@/types/obras';

interface DashboardObrasActiveProps {
  obras: Obra[];
}

function getRiskLevel(obra: Obra): { label: string; color: string } {
  if (obra.status === 'pausada') return { label: 'Alto', color: 'bg-destructive/10 text-destructive border-destructive/20' };
  if (obra.data_fim && new Date(obra.data_fim) < new Date()) {
    const dias = Math.ceil((Date.now() - new Date(obra.data_fim).getTime()) / (1000 * 60 * 60 * 24));
    if (dias > 5) return { label: 'Alto', color: 'bg-destructive/10 text-destructive border-destructive/20' };
    return { label: 'Médio', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/30' };
  }
  return { label: 'Baixo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/30' };
}

function getPrazoDias(obra: Obra): { label: string; color: string } {
  if (!obra.data_fim) return { label: 'Sem prazo', color: 'text-muted-foreground' };
  const diff = Math.ceil((new Date(obra.data_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)} dias atraso`, color: 'text-destructive' };
  if (diff === 0) return { label: 'Prazo hoje', color: 'text-amber-600' };
  return { label: `+${diff} dias`, color: 'text-emerald-600' };
}

export function DashboardObrasActive({ obras }: DashboardObrasActiveProps) {
  const navigate = useNavigate();
  const obrasAtivas = obras.filter(o => o.status === 'em_curso' || o.status === 'pausada').slice(0, 5);

  if (obrasAtivas.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm border-border/50 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">Sem obras em andamento</h3>
        <p className="text-sm text-muted-foreground mb-4">Crie a sua primeira obra para começar.</p>
        <Button onClick={() => navigate('/obras/criar')}>
          Criar Obra
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Obras em Andamento</h2>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/obras')}>
          Ver todas as obras <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {obrasAtivas.map((obra) => {
          const risk = getRiskLevel(obra);
          const prazo = getPrazoDias(obra);
          const progresso = obra.progresso || 0;

          return (
            <Card
              key={obra.id}
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-border/50 cursor-pointer"
              onClick={() => navigate(`/obras/${obra.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Left: name + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground truncate">{obra.nome}</h3>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${risk.color}`}>
                        {risk.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {obra.cliente || 'Sem cliente'} • {obra.endereco || 'Sem localização'}
                    </p>
                  </div>

                  {/* Center: progress */}
                  <div className="w-full md:w-48 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold text-foreground">{Math.round(progresso)}%</span>
                    </div>
                    <Progress value={progresso} className="h-2" />
                  </div>

                  {/* Right: prazo + action */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className={`text-xs font-medium ${prazo.color}`}>{prazo.label}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
