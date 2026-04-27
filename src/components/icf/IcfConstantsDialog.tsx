import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2, RotateCcw } from 'lucide-react';
import {
  ICF_DEFAULT_CONSTANTS,
  useIcfCalculationConstants,
  useSaveIcfCalculationConstants,
  type IcfCalculationConstants,
} from '@/hooks/useIcfCalculationConstants';

const FIELDS: Array<{ key: keyof IcfCalculationConstants; label: string; help: string; step?: number }> = [
  { key: 'aco_kg_por_m3_paredes', label: 'Aço por m³ de paredes (kg/m³)', help: 'Estimativa de armadura por m³ de betão de enchimento' },
  { key: 'painel_area_m2', label: 'Área do painel ICF (m²)', help: 'Painel padrão (ex: 1.20 × 0.30 = 0.36 m²)', step: 0.01 },
  { key: 'fator_topos', label: 'Fator de topos', help: 'Topos por painel (ex: 0.15 = 15%)', step: 0.01 },
  { key: 'fator_cantos_c3', label: 'Fator cantos C3', help: 'Cantos C3 por metro linear de parede', step: 0.01 },
  { key: 'fator_cantos_c4', label: 'Fator cantos C4', help: 'Cantos C4 por metro linear de parede', step: 0.01 },
  { key: 'espacadores_por_painel', label: 'Espaçadores por painel', help: 'Quantidade de espaçadores por cada painel ICF' },
  { key: 'abobadilhas_por_m2', label: 'Abobadilhas por m² de laje', help: 'Ex: 0.5 = 1 abobadilha cada 2 m²', step: 0.01 },
  { key: 'trelicas_ml_por_m2', label: 'Treliças (ml) por m² de laje', help: 'Metros lineares de treliça por m² de laje', step: 0.1 },
  { key: 'altura_media_sapata_m', label: 'Altura média da sapata (m)', help: 'Para estimar a área de execução das sapatas', step: 0.01 },
  { key: 'vaos_por_padieira', label: 'Vãos (m²) por padieira', help: 'Ex: 3 = 1 padieira cada 3 m² de vão', step: 0.1 },
];

export const IcfConstantsDialog = () => {
  const [open, setOpen] = useState(false);
  const { data: current } = useIcfCalculationConstants();
  const save = useSaveIcfCalculationConstants();
  const [values, setValues] = useState<IcfCalculationConstants>(ICF_DEFAULT_CONSTANTS);

  useEffect(() => {
    if (current) setValues(current);
  }, [current, open]);

  const handleSave = async () => {
    await save.mutateAsync(values);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" /> Constantes de cálculo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Constantes de cálculo ICF</DialogTitle>
          <DialogDescription>
            Personaliza os fatores usados na geração de orçamentos ICF. Aplicam-se à próxima geração; orçamentos já criados não são alterados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {FIELDS.map(f => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                step={f.step ?? 1}
                value={values[f.key]}
                onChange={(e) => setValues(v => ({ ...v, [f.key]: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">{f.help}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setValues(ICF_DEFAULT_CONSTANTS)} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Repor predefinidos
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'A guardar…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
