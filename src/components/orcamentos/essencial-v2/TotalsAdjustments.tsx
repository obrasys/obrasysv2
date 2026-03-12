import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatEUR } from '@/types/orcamento-essencial';

interface Props {
  subtotalBase: number;
  contingencyPercent: number;
  discountPercent: number;
  vatPercent: number;
  onContingencyChange: (v: number) => void;
  onDiscountChange: (v: number) => void;
  onVatChange: (v: number) => void;
}

export function TotalsAdjustments({
  subtotalBase,
  contingencyPercent,
  discountPercent,
  vatPercent,
  onContingencyChange,
  onDiscountChange,
  onVatChange,
}: Props) {
  const contingencyValue = subtotalBase * (contingencyPercent / 100);
  const afterContingency = subtotalBase + contingencyValue;
  const discountValue = afterContingency * (discountPercent / 100);
  const subtotalBeforeVat = afterContingency - discountValue;
  const vatValue = subtotalBeforeVat * (vatPercent / 100);
  const totalFinal = subtotalBeforeVat + vatValue;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm">
      <h2 className="text-lg md:text-xl font-bold text-foreground mb-6">Totais & Ajustes</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left - Inputs */}
        <div className="space-y-5">
          <div>
            <Label className="text-sm text-muted-foreground">Imprevistos %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={contingencyPercent}
              onChange={(e) => onContingencyChange(parseFloat(e.target.value) || 0)}
              className="h-11 text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">= {formatEUR(contingencyValue)}</p>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Desconto %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              className="h-11 text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">= -{formatEUR(discountValue)}</p>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">IVA %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={vatPercent}
              onChange={(e) => onVatChange(parseFloat(e.target.value) || 0)}
              className="h-11 text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">IVA € = {formatEUR(vatValue)}</p>
          </div>
        </div>

        {/* Right - Summary lines */}
        <div className="flex flex-col justify-center space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotais base (M.O. + Mat.)</span>
            <span className="font-medium tabular-nums">{formatEUR(subtotalBase)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Desconto</span>
            <span className="font-medium tabular-nums">- {formatEUR(discountValue)}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal antes de IVA</span>
            <span className="font-semibold tabular-nums">{formatEUR(subtotalBeforeVat)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA ({vatPercent.toFixed(2)}%)</span>
            <span className="font-medium tabular-nums">{formatEUR(vatValue)}</span>
          </div>
          <div className="border-t-2 border-foreground/20 pt-3 flex justify-between">
            <span className="text-base font-bold text-foreground">Total Final c/ IVA</span>
            <span className="text-xl font-black tabular-nums text-foreground">{formatEUR(totalFinal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
