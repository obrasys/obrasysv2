import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Building2,
  User,
  Calendar,
  FileText,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { LivroObra } from '@/types/conformidade';
import { LIVRO_OBRA_STATUS_CONFIG } from '@/types/conformidade';

interface LivroObraCardProps {
  livroObra: LivroObra;
  onEdit: (livroObra: LivroObra) => void;
  onDelete: (id: string) => void;
  onSubmit: (id: string) => void;
  onView: (livroObra: LivroObra) => void;
}

export function LivroObraCard({ livroObra, onEdit, onDelete, onSubmit, onView }: LivroObraCardProps) {
  const statusConfig = LIVRO_OBRA_STATUS_CONFIG[livroObra.status];
  const canSubmit = livroObra.status === 'rascunho' || livroObra.status === 'pendente';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{livroObra.titulo}</CardTitle>
            {livroObra.obra && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {livroObra.obra.nome}
              </div>
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
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => onView(livroObra)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(livroObra)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {canSubmit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onSubmit(livroObra.id)}>
                      <Send className="w-4 h-4 mr-2" />
                      Submeter ao fiscal
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(livroObra.id)}
                  className="text-destructive"
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
        {livroObra.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {livroObra.descricao}
          </p>
        )}

        {/* RDOs included */}
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span>{livroObra.rdos_incluidos?.length || 0} RDOs incluídos</span>
        </div>

        {/* People */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {livroObra.gestor && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Gestor</p>
                <p className="font-medium">{livroObra.gestor.nome}</p>
              </div>
            </div>
          )}
          {livroObra.fiscal && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Fiscal</p>
                <p className="font-medium">{livroObra.fiscal.nome}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          {livroObra.data_submissao && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Submetido: {format(new Date(livroObra.data_submissao), "dd/MM/yyyy", { locale: pt })}
            </div>
          )}
          {livroObra.data_aprovacao && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Aprovado: {format(new Date(livroObra.data_aprovacao), "dd/MM/yyyy", { locale: pt })}
            </div>
          )}
          {!livroObra.data_submissao && !livroObra.data_aprovacao && (
            <span>
              Criado em {format(new Date(livroObra.created_at), "dd MMM yyyy", { locale: pt })}
            </span>
          )}
        </div>

        {/* Fiscal observations */}
        {livroObra.observacoes_fiscal && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Observações do Fiscal:</p>
            <p className="text-sm">{livroObra.observacoes_fiscal}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
