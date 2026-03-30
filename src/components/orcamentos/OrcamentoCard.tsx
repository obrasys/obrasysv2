import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

  const custosIndiretosTotal = 
    (orcamento.custos_indiretos?.estaleiro || 0) +
    (orcamento.custos_indiretos?.seguros || 0) +
    (orcamento.custos_indiretos?.licenciamento || 0);

  const subtotal = orcamento.valor_total + custosIndiretosTotal;
  const margemValor = subtotal * (orcamento.margem_lucro / 100);
  const valorFinal = subtotal + margemValor;

  const actions = [
    { icon: Eye, label: 'Ver', onClick: () => onView(orcamento.id) },
    { icon: Edit, label: 'Editar', onClick: () => onEdit(orcamento.id) },
    { icon: Copy, label: 'Duplicar', onClick: () => onDuplicate(orcamento.id) },
    { icon: GitBranch, label: 'Revisão', onClick: () => onRevision(orcamento.id) },
    { icon: FileText, label: 'PDF', onClick: () => onGeneratePDF(orcamento.id) },
    { icon: Trash2, label: 'Eliminar', onClick: () => onDelete(orcamento.id), destructive: true },
  ];

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => onView(orcamento.id)}>
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
              <span className="line-clamp-1">{orcamento.obra.nome}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 cursor-pointer flex-1" onClick={() => onView(orcamento.id)}>
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
      <CardFooter className="border-t pt-3 pb-3 px-3">
        <div className="flex items-center justify-between w-full gap-1">
          {actions.map(({ icon: Icon, label, onClick, destructive }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${destructive ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}