import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface PortalObraCardProps {
  obra: {
    id: string;
    nome: string;
    endereco: string | null;
    status: string;
    progresso: number;
    data_inicio: string | null;
    data_fim: string | null;
    updated_at: string;
  };
}

const statusLabels: Record<string, string> = {
  planeamento: 'Planeamento',
  em_curso: 'Em Curso',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

const statusColors: Record<string, string> = {
  planeamento: 'bg-muted text-muted-foreground',
  em_curso: 'bg-primary/10 text-primary',
  pausada: 'bg-destructive/10 text-destructive',
  concluida: 'bg-green-100 text-green-700',
};

export function PortalObraCard({ obra }: PortalObraCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-card-hover transition-shadow"
      onClick={() => navigate(`/portal/obra/${obra.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground text-lg">{obra.nome}</h3>
            {obra.endereco && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {obra.endereco}
              </p>
            )}
          </div>
          <Badge className={statusColors[obra.status] || 'bg-muted text-muted-foreground'}>
            {statusLabels[obra.status] || obra.status}
          </Badge>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">{Math.round(obra.progresso)}%</span>
          </div>
          <Progress value={obra.progresso} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {obra.data_inicio
              ? format(new Date(obra.data_inicio), 'dd MMM yyyy', { locale: pt })
              : 'Sem data'}
            {obra.data_fim && ` — ${format(new Date(obra.data_fim), 'dd MMM yyyy', { locale: pt })}`}
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
