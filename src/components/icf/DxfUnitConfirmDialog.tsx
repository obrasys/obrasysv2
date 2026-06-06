import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Ruler } from 'lucide-react';

export type DxfUnitOverride = 'mm' | 'cm' | 'm' | 'in' | 'dm';

interface DxfUnitConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detectedUnit?: string | null;
  bbox?: { width: number; height: number; diagonal: number } | null;
  warnings?: Array<{ code: string; message: string; severity: string }>;
  onConfirm: (unit: DxfUnitOverride) => void;
  onCancel: () => void;
  isReanalyzing?: boolean;
}

/**
 * Fase 5 — Pergunta obrigatória sobre a unidade do DXF quando o ficheiro
 * não declarou $INSUNITS ou quando a bounding box é incompatível com a
 * unidade detectada (escala suspeita).
 */
export function DxfUnitConfirmDialog({
  open,
  onOpenChange,
  detectedUnit,
  bbox,
  warnings,
  onConfirm,
  onCancel,
  isReanalyzing,
}: DxfUnitConfirmDialogProps) {
  const [selected, setSelected] = useState<DxfUnitOverride>('mm');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            Confirme a unidade do DXF
          </DialogTitle>
          <DialogDescription>
            {detectedUnit
              ? `O ficheiro indica unidade "${detectedUnit}", mas as medidas parecem inconsistentes.`
              : 'O ficheiro DXF não declara a unidade — escolha qual aplicar antes de continuar.'}
          </DialogDescription>
        </DialogHeader>

        {bbox && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-0.5">
            <p>
              <span className="font-medium">Bounding box atual:</span> {bbox.width} × {bbox.height} m
              (diagonal {bbox.diagonal} m)
            </p>
            <p className="text-muted-foreground">
              Numa moradia típica esperamos diagonais entre 10 e 60 m.
            </p>
          </div>
        )}

        {warnings && warnings.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Avisos de escala
            </div>
            <ul className="list-disc pl-4 text-amber-700/90 dark:text-amber-200/80 space-y-0.5">
              {warnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}

        <RadioGroup
          value={selected}
          onValueChange={(v) => setSelected(v as DxfUnitOverride)}
          className="space-y-2"
        >
          {[
            { v: 'mm', label: 'Milímetros (mm)', hint: 'Mais comum em DXF arquitetónico.' },
            { v: 'cm', label: 'Centímetros (cm)', hint: 'Comum em alguns CAD escolares.' },
            { v: 'm', label: 'Metros (m)', hint: 'Coordenadas já em metros.' },
            { v: 'in', label: 'Polegadas (in)', hint: 'Ficheiros importados de fontes anglo-saxónicas.' },
            { v: 'dm', label: 'Decímetros (dm)', hint: 'Raro — usar apenas se souber.' },
          ].map((opt) => (
            <Label
              key={opt.v}
              htmlFor={`dxf-unit-${opt.v}`}
              className="flex items-start gap-3 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <RadioGroupItem id={`dxf-unit-${opt.v}`} value={opt.v} className="mt-0.5" />
              <span className="flex-1">
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.hint}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isReanalyzing}>
            Cancelar análise
          </Button>
          <Button onClick={() => onConfirm(selected)} disabled={isReanalyzing}>
            {isReanalyzing ? 'A reanalisar...' : 'Confirmar e reanalisar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
