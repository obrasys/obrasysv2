import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

export interface MissingDataValues {
  alturaPadrao: number; // m
  espessuraPadrao: number; // m
  notas: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAltura?: number;
  defaultEspessura?: number;
  onConfirm: (values: MissingDataValues) => void;
  onDiscard: () => void;
  /** Resumo do que está em falta (gerado pelo hook) */
  reasons: string[];
}

/**
 * Lote 2.3 — Modal "Dados em falta": surge quando a análise da Axia devolve
 * paredes sem altura/escala fiável ou com confiança < 0.6. Recolhe valores
 * padrão para o cálculo prosseguir, mantendo o estado `requires_review`.
 */
export function IcfPlantMissingDataDialog({
  open,
  onOpenChange,
  defaultAltura = 2.7,
  defaultEspessura = 0.15,
  onConfirm,
  onDiscard,
  reasons,
}: Props) {
  const [altura, setAltura] = useState(String(defaultAltura));
  const [espessura, setEspessura] = useState(String(defaultEspessura));
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (open) {
      setAltura(String(defaultAltura));
      setEspessura(String(defaultEspessura));
      setNotas('');
    }
  }, [open, defaultAltura, defaultEspessura]);

  const alturaNum = Number(altura.replace(',', '.'));
  const espessuraNum = Number(espessura.replace(',', '.'));
  const alturaOk = Number.isFinite(alturaNum) && alturaNum >= 1.5 && alturaNum <= 6;
  const espessuraOk = Number.isFinite(espessuraNum) && espessuraNum >= 0.05 && espessuraNum <= 0.6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Dados em falta na planta
          </DialogTitle>
          <DialogDescription>
            A Axia precisa de confirmação humana antes de levar estas paredes para orçamento.
            Os valores ficam marcados como “requer revisão”.
          </DialogDescription>
        </DialogHeader>

        {reasons.length > 0 && (
          <ul className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1 list-disc pl-5">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="missing-altura">Pé-direito padrão (m)</Label>
            <Input
              id="missing-altura"
              inputMode="decimal"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Aplicado às paredes sem altura legível. Entre 1.5 e 6.0 m.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="missing-espessura">Espessura do núcleo padrão (m)</Label>
            <Input
              id="missing-espessura"
              inputMode="decimal"
              value={espessura}
              onChange={(e) => setEspessura(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Entre 0.05 e 0.60 m.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="missing-notas">Notas de validação (opcional)</Label>
            <Textarea
              id="missing-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex.: escala obtida por medição manual de uma porta de 0,90 m."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onDiscard}>
            Descartar análise
          </Button>
          <Button
            disabled={!alturaOk || !espessuraOk}
            onClick={() =>
              onConfirm({
                alturaPadrao: alturaNum,
                espessuraPadrao: espessuraNum,
                notas: notas.trim(),
              })
            }
          >
            Aplicar e marcar para revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
