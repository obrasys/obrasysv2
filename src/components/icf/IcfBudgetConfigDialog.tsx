import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Calculator, Save, Trash2, Bookmark } from 'lucide-react';
import { useIcfBudgetPresets, useSaveIcfBudgetPreset, useDeleteIcfBudgetPreset } from '@/hooks/useIcfBudgetPresets';

export interface IcfBudgetFinancials {
  margem_lucro: number;
  iva_percent: number;
  /** Valor absoluto (€) para o capítulo "Estaleiros e Escavações" */
  estaleiro_valor: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (values: IcfBudgetFinancials) => void;
  isPending?: boolean;
  defaults?: Partial<IcfBudgetFinancials>;
}

export function IcfBudgetConfigDialog({ open, onOpenChange, onConfirm, isPending, defaults }: Props) {
  const { data: presets } = useIcfBudgetPresets();
  const savePreset = useSaveIcfBudgetPreset();
  const deletePreset = useDeleteIcfBudgetPreset();

  const [margem, setMargem] = useState<number>(defaults?.margem_lucro ?? 15);
  const [iva, setIva] = useState<number>(defaults?.iva_percent ?? 23);
  const [estaleiro, setEstaleiro] = useState<number>(defaults?.estaleiro_valor ?? 0);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const [showSave, setShowSave] = useState(false);
  const [presetNome, setPresetNome] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Aplicar preset default automaticamente na primeira abertura
  useEffect(() => {
    if (!open || !presets?.length || selectedPresetId) return;
    const def = presets.find((p) => p.is_default);
    if (def) {
      setSelectedPresetId(def.id);
      setMargem(Number(def.margem_lucro));
      setIva(Number(def.iva_percent));
      setEstaleiro(Number(def.custos_indiretos_percent));
    }
  }, [open, presets, selectedPresetId]);

  const handleApplyPreset = (id: string) => {
    setSelectedPresetId(id);
    const p = presets?.find((x) => x.id === id);
    if (!p) return;
    setMargem(Number(p.margem_lucro));
    setIva(Number(p.iva_percent));
    setEstaleiro(Number(p.custos_indiretos_percent));
  };

  const handleSavePreset = () => {
    if (!presetNome.trim()) return;
    savePreset.mutate(
      {
        nome: presetNome.trim(),
        margem_lucro: Number(margem) || 0,
        iva_percent: Number(iva) || 0,
        custos_indiretos_percent: Number(estaleiro) || 0,
        is_default: setAsDefault,
      },
      {
        onSuccess: () => {
          setShowSave(false);
          setPresetNome('');
          setSetAsDefault(false);
        },
      },
    );
  };

  const submit = () => {
    onConfirm({
      margem_lucro: Number(margem) || 0,
      iva_percent: Number(iva) || 0,
      estaleiro_valor: Number(estaleiro) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
          {/* Presets */}
          {presets && presets.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/40 border">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Bookmark className="h-3 w-3" /> Presets guardados
              </Label>
              <div className="flex gap-2">
                <Select value={selectedPresetId} onValueChange={handleApplyPreset}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Aplicar preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} {p.is_default && '★'} — {p.margem_lucro}% / {p.iva_percent}% / {p.custos_indiretos_percent}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPresetId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePreset.mutate(selectedPresetId, { onSuccess: () => setSelectedPresetId('') })}
                    disabled={deletePreset.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="estaleiro">Estaleiros e Escavações (€)</Label>
            <Input id="estaleiro" type="number" min={0} step="0.01" value={estaleiro} onChange={(e) => setEstaleiro(parseFloat(e.target.value))} />
            <p className="text-xs text-muted-foreground">Valor fixo (€) — capítulo separado e editável: preparação de estaleiro, marcação e escavação às cotas.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="margem">Margem de Lucro (%)</Label>
            <Input id="margem" type="number" min={0} max={99.99} step="0.1" value={margem} onChange={(e) => setMargem(parseFloat(e.target.value))} />
            <p className="text-xs text-muted-foreground">Margem real sobre preço de venda: PV = Custo / (1 - Margem%)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iva">IVA (%)</Label>
            <Input id="iva" type="number" min={0} max={100} step="0.1" value={iva} onChange={(e) => setIva(parseFloat(e.target.value))} />
            <p className="text-xs text-muted-foreground">23% padrão · 6% empreitadas habitação · 0% autoliquidação</p>
          </div>

          {/* Guardar como preset */}
          {!showSave ? (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSave(true)}>
              <Save className="h-4 w-4 mr-2" />
              Guardar como preset
            </Button>
          ) : (
            <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <Label htmlFor="preset-nome" className="text-sm">Nome do preset</Label>
              <Input id="preset-nome" placeholder="Ex: Habitação Lisboa" value={presetNome} onChange={(e) => setPresetNome(e.target.value)} />
              <div className="flex items-center gap-2">
                <Checkbox id="default" checked={setAsDefault} onCheckedChange={(v) => setSetAsDefault(!!v)} />
                <Label htmlFor="default" className="text-xs cursor-pointer">Definir como padrão</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowSave(false); setPresetNome(''); }} className="flex-1">
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSavePreset} disabled={!presetNome.trim() || savePreset.isPending} className="flex-1">
                  {savePreset.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Gerar Orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
