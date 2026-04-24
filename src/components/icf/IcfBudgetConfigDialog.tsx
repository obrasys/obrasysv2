import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Calculator } from 'lucide-react';

export interface IcfBudgetFinancials {
  margem_lucro: number;
  iva_percent: number;
  custos_indiretos_percent: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (values: IcfBudgetFinancials) => void;
  isPending?: boolean;
  defaults?: Partial<IcfBudgetFinancials>;
}

export function IcfBudgetConfigDialog({ open, onOpenChange, onConfirm, isPending, defaults }: Props) {
  const [margem, setMargem] = useState<number>(defaults?.margem_lucro ?? 15);
  const [iva, setIva] = useState<number>(defaults?.iva_percent ?? 23);
  const [indiretos, setIndiretos] = useState<number>(defaults?.custos_indiretos_percent ?? 8);

  const submit = () => {
    onConfirm({
      margem_lucro: Number(margem) || 0,
      iva_percent: Number(iva) || 0,
      custos_indiretos_percent: Number(indiretos) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Configurar Orçamento ICF
          </DialogTitle>
          <DialogDescription>
            Defina margem, custos indiretos e IVA aplicados antes de gerar o documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="indiretos">Custos Indiretos (%)</Label>
            <Input
              id="indiretos"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={indiretos}
              onChange={(e) => setIndiretos(parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Aplicado sobre o subtotal (estaleiro, transporte, equipamentos, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="margem">Margem de Lucro (%)</Label>
            <Input
              id="margem"
              type="number"
              min={0}
              max={99.99}
              step="0.1"
              value={margem}
              onChange={(e) => setMargem(parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Margem real sobre preço de venda: PV = Custo / (1 - Margem%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iva">IVA (%)</Label>
            <Input
              id="iva"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={iva}
              onChange={(e) => setIva(parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              23% padrão · 6% empreitadas habitação · 0% autoliquidação
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Gerar Orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
