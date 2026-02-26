import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RDOStatusBadge } from './RDOStatusBadge';
import type { RelatorioDiario } from '@/types/rdos';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Send,
  Check,
  Calendar,
  HardHat,
  Cloud,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface RDOCardProps {
  rdo: RelatorioDiario;
  onEdit?: (rdo: RelatorioDiario) => void;
  onDelete?: (rdo: RelatorioDiario) => void;
  onSubmit?: (rdo: RelatorioDiario) => void;
  onApprove?: (rdo: RelatorioDiario) => void;
  showObra?: boolean;
}

export function RDOCard({ 
  rdo, 
  onEdit, 
  onDelete, 
  onSubmit, 
  onApprove,
  showObra = true 
}: RDOCardProps) {
  const navigate = useNavigate();

  const formatDate = (date: string) => {
    return format(new Date(date), "EEEE, d 'de' MMMM", { locale: pt });
  };

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return null;
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="capitalize">{formatDate(rdo.data)}</span>
            </div>
            {showObra && rdo.obra && (
              <h3 className="font-semibold text-foreground mt-1 flex items-center gap-2">
                <HardHat className="h-4 w-4 text-primary" />
                {rdo.obra.nome}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RDOStatusBadge status={rdo.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => navigate(`/rdos/${rdo.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalhes
                </DropdownMenuItem>
                {rdo.status === 'rascunho' && (
                  <DropdownMenuItem onClick={() => onEdit?.(rdo)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {rdo.status === 'rascunho' && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(rdo)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content preview */}
        {rdo.trabalhos_executados && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {truncateText(rdo.trabalhos_executados, 150)}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {rdo.condicoes_meteorologicas && (
            <span className="flex items-center gap-1">
              <Cloud className="h-3.5 w-3.5" />
              {rdo.condicoes_meteorologicas}
            </span>
          )}
          {rdo.mao_de_obra_presente > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {rdo.mao_de_obra_presente} trabalhadores
            </span>
          )}
          {rdo.trabalhos_quantificados && rdo.trabalhos_quantificados.length > 0 && (
            <span className="text-primary font-medium">
              {rdo.trabalhos_quantificados.length} trabalhos quantificados
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/rdos/${rdo.id}`)}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            Ver
          </Button>
          {rdo.status === 'rascunho' && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEdit?.(rdo)}>
              <Edit className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          )}
          {rdo.status === 'rascunho' && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onSubmit?.(rdo)}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Submeter
            </Button>
          )}
          {rdo.status === 'submetido' && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onApprove?.(rdo)}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Aprovar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
