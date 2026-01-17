import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Building2, MapPin, Calendar, MoreVertical, Archive, Trash2, Edit, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Obra } from '@/types/obras';
import { OBRA_STATUS_CONFIG } from '@/types/obras';

interface ObraCardProps {
  obra: Obra;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ObraCard({ obra, onArchive, onDelete }: ObraCardProps) {
  const navigate = useNavigate();
  const statusConfig = OBRA_STATUS_CONFIG[obra.status as keyof typeof OBRA_STATUS_CONFIG] || OBRA_STATUS_CONFIG.planeamento;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const orcamentosCount = obra.orcamentos?.length || 0;
  const valorTotal = obra.orcamentos?.reduce((sum, orc) => sum + (orc.valor_total || 0), 0) || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg truncate">{obra.nome}</h3>
            </div>
            {obra.cliente && (
              <p className="text-sm text-muted-foreground truncate">{obra.cliente}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
              {statusConfig.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={() => navigate(`/obras/${obra.id}`)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/obras/${obra.id}/editar`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onArchive(obra.id)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(obra.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {obra.endereco && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{obra.endereco}</span>
          </div>
        )}

        {obra.data_inicio && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(obra.data_inicio), 'dd MMM yyyy', { locale: pt })}
              {obra.data_fim && (
                <> → {format(new Date(obra.data_fim), 'dd MMM yyyy', { locale: pt })}</>
              )}
            </span>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{Math.round(obra.progresso || 0)}%</span>
          </div>
          <Progress value={obra.progresso || 0} className="h-2" />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Orçamentos</p>
            <p className="font-semibold">{orcamentosCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="font-semibold">{formatCurrency(valorTotal)}</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate(`/obras/${obra.id}`)}
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );
}
