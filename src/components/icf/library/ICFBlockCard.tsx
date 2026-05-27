import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scissors, Ruler } from 'lucide-react';
import { ICFBlockSvgViewer } from './ICFBlockSvgViewer';
import type { ICFBlockLibraryItem } from '@/types/icf-homeblock';

const CATEGORY_LABEL: Record<string, string> = {
  bloco_principal: 'Bloco principal',
  topo: 'Topo / Remate',
  espacador: 'Espaçador',
  detalhe_tecnico: 'Detalhe técnico',
  canto: 'Canto',
  meio_bloco: 'Meio bloco',
  especial: 'Especial',
};

export const ICFBlockCard = ({ item }: { item: ICFBlockLibraryItem }) => {
  return (
    <Card className="rounded-xl border-border/60 overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-white border-b">
        {item.drawing_file ? (
          <ICFBlockSvgViewer src={item.drawing_file} alt={item.name} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Sem desenho técnico
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-sm leading-tight">{item.name}</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.code}</div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {CATEGORY_LABEL[item.category] ?? item.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2 flex-1">
        {(item.length_mm || item.height_mm || item.thickness_mm) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Ruler className="h-3 w-3" />
            <span>
              {[
                item.length_mm && `${item.length_mm} mm`,
                item.height_mm && `${item.height_mm} mm`,
                item.thickness_mm && `${item.thickness_mm} mm`,
              ]
                .filter(Boolean)
                .join(' × ')}
            </span>
          </div>
        )}
        {item.can_be_cut && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <Scissors className="h-3 w-3" />
            Permite corte
          </div>
        )}
        {item.use_case && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.use_case}</p>
        )}
      </CardContent>
    </Card>
  );
};
