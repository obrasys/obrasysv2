import { format, parseISO, isPast, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit, 
  Upload,
  FileText,
  Users,
  Package,
  Building2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { ContaStatusBadge } from './ContaStatusBadge';
import { ORIGEM_CONTA_CONFIG } from '@/types/financeiro';
import type { ContaFinanceira } from '@/types/financeiro';

interface ContaCardProps {
  conta: ContaFinanceira;
  onEdit: (conta: ContaFinanceira) => void;
  onDelete: (id: string) => void;
  onTogglePago: (id: string, pago: boolean) => void;
  onUploadComprovante: (conta: ContaFinanceira) => void;
}

const OrigemIcon = ({ origem }: { origem: string }) => {
  switch (origem) {
    case 'mao_de_obra':
      return <Users className="h-4 w-4" />;
    case 'material':
      return <Package className="h-4 w-4" />;
    default:
      return <MoreHorizontal className="h-4 w-4" />;
  }
};

export function ContaCard({ conta, onEdit, onDelete, onTogglePago, onUploadComprovante }: ContaCardProps) {
  const vencimento = parseISO(conta.data_vencimento);
  const isVencida = !conta.pago && isPast(vencimento) && !isToday(vencimento);
  const isHoje = isToday(vencimento);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const origemConfig = ORIGEM_CONTA_CONFIG[conta.origem];

  return (
    <Card className={`transition-all hover:shadow-md ${isVencida ? 'border-red-300 bg-red-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <ContaStatusBadge tipo={conta.tipo} pago={conta.pago} />
              <Badge variant="outline" className="flex items-center gap-1">
                <OrigemIcon origem={conta.origem} />
                {origemConfig.label}
              </Badge>
              {isVencida && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Vencida
                </Badge>
              )}
              {isHoje && !conta.pago && (
                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                  Vence Hoje
                </Badge>
              )}
            </div>

            <p className={`text-xl font-bold ${conta.tipo === 'pagar' ? 'text-red-600' : 'text-green-600'}`}>
              {conta.tipo === 'pagar' ? '-' : '+'} {formatCurrency(Number(conta.valor))}
            </p>

            {conta.descricao && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {conta.descricao}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Vence: {format(vencimento, "dd/MM/yyyy", { locale: pt })}
              </span>
              
              {conta.pago && conta.data_pagamento && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Pago: {format(parseISO(conta.data_pagamento), "dd/MM/yyyy", { locale: pt })}
                </span>
              )}

              {conta.obra && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {conta.obra.nome}
                </span>
              )}

              {conta.fornecedor && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {conta.fornecedor.nome}
                </span>
              )}

              {conta.comprovante_url && (
                <a 
                  href={conta.comprovante_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" />
                  Comprovante
                </a>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTogglePago(conta.id, !conta.pago)}>
                {conta.pago ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Marcar Pendente
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marcar Pago
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUploadComprovante(conta)}>
                <Upload className="mr-2 h-4 w-4" />
                Enviar Comprovante
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(conta)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(conta.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
