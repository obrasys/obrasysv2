import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { FOUNDATION_OPTIONS } from '@/lib/icf-foundation-suggestions';
import { FoundationOptionCard } from './FoundationOptionCard';
import type { FoundationOptionKey } from '@/types/icf-assistant';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseIcfWallLength: number;
  defaultsOverride?: Record<string, number>;
  selectedOption?: string | null;
  isPending?: boolean;
  onApply: (key: FoundationOptionKey, params: Record<string, number | boolean>) => void;
}

export function IcfFoundationsModal({
  open,
  onOpenChange,
  baseIcfWallLength,
  defaultsOverride,
  selectedOption,
  isPending,
  onApply,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Fundações não detectadas na planta
          </DialogTitle>
          <DialogDescription>
            A Axia analisou a planta mas não encontrou fundações desenhadas. Para gerar o orçamento
            ICF, escolha o tipo de fundação a considerar e preencha os parâmetros básicos. Estas
            sugestões são preliminares e requerem validação técnica.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {FOUNDATION_OPTIONS.map((opt) => (
            <FoundationOptionCard
              key={opt.key}
              option={opt}
              selected={selectedOption === opt.key}
              baseIcfWallLength={baseIcfWallLength}
              defaultsOverride={defaultsOverride}
              isPending={isPending}
              onApply={(p) => {
                onApply(opt.key as FoundationOptionKey, p);
                onOpenChange(false);
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
