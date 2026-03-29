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
    return format(new Date(date), "dd/MM/yyyy", { locale: pt });
  };

  const formatDayName = (date: string) => {
    return format(new Date(date), "EEE", { locale: pt });
  };

  return (
    <div 
      className="group flex items-center gap-4 p-3 md:p-4 border rounded-lg bg-card hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => navigate(`/rdos/${rdo.id}`)}
    >
      {/* Date indicator */}
      <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
        <span className="text-xs font-medium text-primary uppercase">{formatDayName(rdo.data)}</span>
        <span className="text-sm font-bold text-primary">{format(new Date(rdo.data), "dd")}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showObra && rdo.obra && (
            <span className="text-sm font-semibold truncate">{rdo.obra.nome}</span>
          )}
          <RDOStatusBadge status={rdo.status} />
        </div>
        {rdo.trabalhos_executados && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {rdo.trabalhos_executados}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />{formatDate(rdo.data)}
          </span>
          {rdo.condicoes_meteorologicas && (
            <span className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />{rdo.condicoes_meteorologicas}
            </span>
          )}
          {rdo.mao_de_obra_presente > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />{rdo.mao_de_obra_presente}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {rdo.status === 'rascunho' && (
          <>
            <Button variant="outline" size="sm" className="h-7 text-xs hidden sm:flex" onClick={() => onEdit?.(rdo)}>
              <Edit className="h-3 w-3 mr-1" />Editar
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => onSubmit?.(rdo)}>
              <Send className="h-3 w-3 mr-1" />Submeter
            </Button>
          </>
        )}
        {rdo.status === 'submetido' && (
          <Button size="sm" className="h-7 text-xs" onClick={() => onApprove?.(rdo)}>
            <Check className="h-3 w-3 mr-1" />Aprovar
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => navigate(`/rdos/${rdo.id}`)}>
              <Eye className="mr-2 h-4 w-4" />Ver detalhes
            </DropdownMenuItem>
            {rdo.status === 'rascunho' && (
              <DropdownMenuItem onClick={() => onEdit?.(rdo)}>
                <Edit className="mr-2 h-4 w-4" />Editar
              </DropdownMenuItem>
            )}
            {rdo.status === 'rascunho' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete?.(rdo)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
