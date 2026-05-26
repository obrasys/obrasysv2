import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ArtigoOrcamento } from '@/types/orcamentos';
import { Edit, Trash2 } from 'lucide-react';
import {
  CAPITULO_COLUMNS,
  getCellValue,
  type CapituloColumnKey,
} from '@/lib/capitulo-columns';

interface ArtigoRowProps {
  artigo: ArtigoOrcamento;
  onEdit: () => void;
  onDelete: () => void;
  isReadOnly?: boolean;
  visibleCols: CapituloColumnKey[];
}

export function ArtigoRow({ artigo, onEdit, onDelete, isReadOnly = false, visibleCols }: ArtigoRowProps) {
  const cols = CAPITULO_COLUMNS.filter((c) => visibleCols.includes(c.key));

  // Build grid template: Item gets generous fr, numeric columns get fixed minimum widths
  const gridTemplate = cols
    .map((c) => {
      if (c.key === 'item') return 'minmax(180px, 2.5fr)';
      if (c.key === 'unidade') return 'minmax(56px, 0.6fr)';
      if (c.key === 'qtd') return 'minmax(64px, 0.7fr)';
      if (c.key === 'subtotal') return 'minmax(96px, 1fr)';
      return 'minmax(84px, 0.9fr)';
    })
    .join(' ') + ' 64px'; // actions column

  return (
    <div
      className="grid gap-2 px-3 py-2 items-center hover:bg-muted/50 rounded-md group text-sm"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {cols.map((col) => {
        const value = getCellValue(artigo, col.key);
        const alignClass = col.numeric ? 'text-right tabular-nums' : 'text-left';
        const isSubtotal = col.key === 'subtotal';
        const isUnidade = col.key === 'unidade';

        if (col.key === 'item') {
          return (
            <div key={col.key} className="flex items-start gap-2 min-w-0">
              {artigo.codigo && (
                <Badge variant="outline" className="font-mono text-[10px] shrink-0 mt-0.5">
                  {artigo.codigo}
                </Badge>
              )}
              <span className="line-clamp-2 break-words">{value}</span>
            </div>
          );
        }

        return (
          <div
            key={col.key}
            className={`${alignClass} ${isSubtotal ? 'font-semibold' : ''} ${isUnidade ? 'text-center' : ''} truncate`}
            title={value}
          >
            {value}
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-1">
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
