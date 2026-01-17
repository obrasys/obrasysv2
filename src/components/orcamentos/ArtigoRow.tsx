import { Button } from '@/components/ui/button';
import type { ArtigoOrcamento } from '@/types/orcamentos';
import { Edit, Trash2 } from 'lucide-react';

interface ArtigoRowProps {
  artigo: ArtigoOrcamento;
  onEdit: () => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export function ArtigoRow({ artigo, onEdit, onDelete, isReadOnly = false }: ArtigoRowProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatQuantity = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-muted/50 rounded-md group">
      <div className="col-span-1 text-sm text-muted-foreground truncate">
        {artigo.codigo || '-'}
      </div>
      <div className="col-span-4 text-sm line-clamp-2">{artigo.descricao}</div>
      <div className="col-span-1 text-sm text-center">{artigo.unidade}</div>
      <div className="col-span-2 text-sm text-right">{formatQuantity(artigo.quantidade)}</div>
      <div className="col-span-2 text-sm text-right">{formatCurrency(artigo.preco_unitario)}</div>
      <div className="col-span-2 text-sm text-right font-medium flex items-center justify-end gap-2">
        <span>{formatCurrency(artigo.valor_total)}</span>
        {!isReadOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
