import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const statusConfig: Record<string, { label: string; className: string }> = {
  planeamento: { label: 'Planeamento', className: 'bg-muted text-muted-foreground' },
  em_curso: { label: 'Em Curso', className: 'bg-primary/10 text-primary' },
  pausada: { label: 'Pausada', className: 'bg-destructive/10 text-destructive' },
  concluida: { label: 'Concluída', className: 'bg-green-100 text-green-700' },
};

export function PortalObraCard({ obra }: PortalObraCardProps) {
  const navigate = useNavigate();
  const progress = Math.round(obra.progresso);
  const config = statusConfig[obra.status] || statusConfig.planeamento;

  // Calculate stroke for circular progress
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card
      className="cursor-pointer group hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/30"
      onClick={() => navigate(`/portal/obra/${obra.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-semibold text-foreground text-base leading-tight group-hover:text-primary transition-colors">
              {obra.nome}
            </h3>
            {obra.endereco && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{obra.endereco}</span>
              </p>
            )}
          </div>

          {/* Circular Progress */}
          <div className="relative h-16 w-16 shrink-0">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="5"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
              {progress}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge className={`${config.className} text-[11px] font-medium`}>
            {config.label}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {obra.data_inicio
              ? format(new Date(obra.data_inicio), 'MMM yyyy', { locale: pt })
              : 'Sem data'}
            <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}