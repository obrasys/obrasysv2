import { Badge } from '@/components/ui/badge';
import { ScanLine, Calculator, Sparkles, UserCheck, AlertTriangle } from 'lucide-react';
import type { IcfSourceType } from '@/types/icf-assistant';

const MAP: Record<IcfSourceType, { label: string; className: string; Icon: typeof ScanLine }> = {
  extraido_planta: { label: 'Extraído da planta', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30', Icon: ScanLine },
  calculado_sistema: { label: 'Calculado pelo sistema', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', Icon: Calculator },
  sugerido_axia: { label: 'Sugerido pela Axia', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', Icon: Sparkles },
  confirmado_utilizador: { label: 'Confirmado', className: 'bg-primary/15 text-primary border-primary/30', Icon: UserCheck },
};

export function SourceBadge({ source, reviewRequired }: { source: IcfSourceType; reviewRequired?: boolean }) {
  const cfg = MAP[source];
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={cfg.className}>
        <cfg.Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
      {reviewRequired && (
        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Revisão
        </Badge>
      )}
    </div>
  );
}
