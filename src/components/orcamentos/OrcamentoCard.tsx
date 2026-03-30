import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrcamentoStatus } from './OrcamentoStatus';
import type { Orcamento } from '@/types/orcamentos';
import { 
  Edit, 
  Copy, 
  FileText, 
  Trash2, 
  Building2,
  Calendar,
  Euro,
  GitBranch,
  Hash,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface OrcamentoCardProps {
  orcamento: Orcamento;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRevision: (id: string) => void;
  onDelete: (id: string) => void;
  onGeneratePDF: (id: string) => void;
}

export function OrcamentoCard({
  orcamento,
  onView,
  onEdit,
  onDuplicate,
  onRevision,
  onDelete,
  onGeneratePDF,
}: OrcamentoCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  // Calcular valor com margem e custos indiretos
  const custosIndiretosTotal = 
    (orcamento.custos_indiretos?.estaleiro || 0) +
    (orcamento.custos_indiretos?.seguros || 0) +
    (orcamento.custos_indiretos?.licenciamento || 0);

  const subtotal = orcamento.valor_total + custosIndiretosTotal;
  const margemValor = subtotal * (orcamento.margem_lucro / 100);
  const valorFinal = subtotal + margemValor;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(orcamento.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {orcamento.codigo && (
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>{orcamento.codigo}</span>
              </div>
            )}
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {orcamento.titulo}
            </CardTitle>
            {orcamento.obra && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{orcamento.obra.nome}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(orcamento.id); }}>
                <FileText className="mr-2 h-4 w-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(orcamento.id); }}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(orcamento.id); }}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRevision(orcamento.id); }}>
                <GitBranch className="mr-2 h-4 w-4" />
                Criar Revisão
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onGeneratePDF(orcamento.id); }}>
                <FileText className="mr-2 h-4 w-4" />
                Gerar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(orcamento.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <OrcamentoStatus status={orcamento.status} />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(new Date(orcamento.data_criacao), "d 'de' MMM, yyyy", { locale: pt })}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(orcamento.valor_total)}</span>
          </div>
          {custosIndiretosTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custos Indiretos</span>
              <span>{formatCurrency(custosIndiretosTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Margem ({orcamento.margem_lucro}%)</span>
            <span>{formatCurrency(margemValor)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span className="flex items-center gap-1">
              <Euro className="h-4 w-4" />
              Total
            </span>
            <span className="text-primary">{formatCurrency(valorFinal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
