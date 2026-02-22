import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { useObras } from '@/hooks/useObras';
import {
  type PackageFormData,
  type Specialty,
  type EquipamentoExtra,
  PROFILE_LABELS,
  COMPLEXITY_LABELS,
  TYPOLOGY_OPTIONS,
  PLUMBING_EQUIPMENT_COSTS,
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
    <Card>
      <CardHeader>
        <CardTitle>Novo Pacote</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select value={form.obra_id} onValueChange={v => set('obra_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar obra" /></SelectTrigger>
                <SelectContent>
                  {(obras ?? []).map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipologia</Label>
              <Select value={form.typology} onValueChange={v => set('typology', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPOLOGY_OPTIONS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Área (m²)</Label>
              <Input type="number" min={1} value={form.area_m2} onChange={e => set('area_m2', Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Nº WC</Label>
              <Input type="number" min={0} value={form.bathrooms} onChange={e => set('bathrooms', Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Nº Quartos</Label>
              <Input type="number" min={0} value={form.bedrooms} onChange={e => set('bedrooms', Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Nº Cozinhas</Label>
              <Input type="number" min={0} value={form.kitchen_count} onChange={e => set('kitchen_count', Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Divisões Extra</Label>
              <Input type="number" min={0} value={form.extra_rooms} onChange={e => set('extra_rooms', Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Perfil de Preço</Label>
              <Select value={form.profile} onValueChange={v => set('profile', v as Profile)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(PROFILE_LABELS) as [Profile, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Complexidade</Label>
              <Select value={form.complexity} onValueChange={v => set('complexity', v as Complexity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(COMPLEXITY_LABELS) as [Complexity, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {specialty === 'plumbing' && (
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.has_laundry} onCheckedChange={v => set('has_laundry', v)} />
                <Label>Lavandaria</Label>
              </div>
            )}
          </div>

          {/* Plumbing Equipment Section */}
          {specialty === 'plumbing' && (
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Equipamentos de Canalização</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_bomba_calor} onCheckedChange={v => set('has_bomba_calor', v)} />
                  <Label className="text-sm">Bomba de Calor</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_termoacumulador} onCheckedChange={v => set('has_termoacumulador', v)} />
                  <Label className="text-sm">Termoacumulador</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_piso_radiante} onCheckedChange={v => set('has_piso_radiante', v)} />
                  <Label className="text-sm">Piso Radiante</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_paineis_solares} onCheckedChange={v => set('has_paineis_solares', v)} />
                  <Label className="text-sm">Painéis Solares</Label>
                </div>
              </div>

              {/* Custom equipment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Equipamentos Adicionais</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addEquipamento}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {form.equipamentos_extra.map((eq, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Nome do equipamento"
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
                      className="w-20"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Custo (€)"
                      value={eq.custo_unitario}
                      onChange={e => updateEquipamento(idx, 'custo_unitario', Number(e.target.value))}
                      className="w-28"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEquipamento(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !form.obra_id}>
              {loading ? 'A criar...' : 'Criar Pacote'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
