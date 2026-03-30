import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useObras } from '@/hooks/useObras';
import {
  type PackageFormData,
  type Specialty,
  type EquipamentoExtra,
  PROFILE_LABELS,
  COMPLEXITY_LABELS,
  TYPOLOGY_OPTIONS,
  type Profile,
  type Complexity,
} from '@/types/instalacoes';

interface Props {
  specialty: Specialty;
  defaultObraId?: string;
  onSubmit: (data: PackageFormData) => void;
  loading?: boolean;
}

export function PackageForm({ specialty, defaultObraId, onSubmit, loading }: Props) {
  const { obras } = useObras();
  const [form, setForm] = useState<PackageFormData>({
    obra_id: defaultObraId ?? '',
    specialty,
    profile: 'med',
    complexity: 'normal',
    typology: 'T3',
    area_m2: 100,
    bathrooms: 1,
    bedrooms: 2,
    kitchen_count: 1,
    extra_rooms: 0,
    has_laundry: false,
    has_bomba_calor: false,
    has_termoacumulador: false,
    has_piso_radiante: false,
    has_paineis_solares: false,
    equipamentos_extra: [],
  });

  useEffect(() => {
    if (defaultObraId) setForm(f => ({ ...f, obra_id: defaultObraId }));
  }, [defaultObraId]);

  const set = (key: keyof PackageFormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const addEquipamento = () => {
    setForm(f => ({
      ...f,
      equipamentos_extra: [...f.equipamentos_extra, { nome: '', quantidade: 1, custo_unitario: 0 }],
    }));
  };

  const updateEquipamento = (idx: number, field: keyof EquipamentoExtra, value: any) => {
    setForm(f => {
      const updated = [...f.equipamentos_extra];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, equipamentos_extra: updated };
    });
  };

  const removeEquipamento = (idx: number) => {
    setForm(f => ({
      ...f,
      equipamentos_extra: f.equipamentos_extra.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.obra_id) return;
    if (form.area_m2 <= 0) return;
    onSubmit(form);
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Core info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-muted-foreground">Obra</Label>
              <Select value={form.obra_id} onValueChange={v => set('obra_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar obra" /></SelectTrigger>
                <SelectContent>
                  {(obras ?? []).map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipologia</Label>
              <Select value={form.typology} onValueChange={v => set('typology', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPOLOGY_OPTIONS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Perfil</Label>
              <Select value={form.profile} onValueChange={v => set('profile', v as Profile)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(PROFILE_LABELS) as [Profile, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Complexidade</Label>
              <Select value={form.complexity} onValueChange={v => set('complexity', v as Complexity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(COMPLEXITY_LABELS) as [Complexity, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Dimensions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Área (m²)</Label>
              <Input type="number" min={1} value={form.area_m2} onChange={e => set('area_m2', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">WC</Label>
              <Input type="number" min={0} value={form.bathrooms} onChange={e => set('bathrooms', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quartos</Label>
              <Input type="number" min={0} value={form.bedrooms} onChange={e => set('bedrooms', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cozinhas</Label>
              <Input type="number" min={0} value={form.kitchen_count} onChange={e => set('kitchen_count', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Divisões Extra</Label>
              <Input type="number" min={0} value={form.extra_rooms} onChange={e => set('extra_rooms', Number(e.target.value))} />
            </div>
          </div>

          {/* Plumbing extras */}
          {specialty === 'plumbing' && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <h4 className="font-medium text-sm">Equipamentos de Canalização</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_laundry} onCheckedChange={v => set('has_laundry', v)} id="laundry" />
                  <Label htmlFor="laundry" className="text-sm cursor-pointer">Lavandaria</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_bomba_calor} onCheckedChange={v => set('has_bomba_calor', v)} id="bomba" />
                  <Label htmlFor="bomba" className="text-sm cursor-pointer">Bomba de Calor</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_termoacumulador} onCheckedChange={v => set('has_termoacumulador', v)} id="termo" />
                  <Label htmlFor="termo" className="text-sm cursor-pointer">Termoacumulador</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_piso_radiante} onCheckedChange={v => set('has_piso_radiante', v)} id="piso" />
                  <Label htmlFor="piso" className="text-sm cursor-pointer">Piso Radiante</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_paineis_solares} onCheckedChange={v => set('has_paineis_solares', v)} id="solar" />
                  <Label htmlFor="solar" className="text-sm cursor-pointer">Painéis Solares</Label>
                </div>
              </div>

              {/* Custom equipment */}
              {form.equipamentos_extra.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Equipamentos Adicionais</Label>
                  {form.equipamentos_extra.map((eq, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Nome"
                        value={eq.nome}
                        onChange={e => updateEquipamento(idx, 'nome', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qtd"
                        value={eq.quantidade}
                        onChange={e => updateEquipamento(idx, 'quantidade', Number(e.target.value))}
                        className="w-16"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="€"
                        value={eq.custo_unitario}
                        onChange={e => updateEquipamento(idx, 'custo_unitario', Number(e.target.value))}
                        className="w-24"
                      />
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeEquipamento(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addEquipamento} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Equipamento Extra
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !form.obra_id} className="gap-1.5">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'A criar...' : 'Criar Pacote'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
