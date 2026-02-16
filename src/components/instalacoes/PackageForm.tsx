import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useObras } from '@/hooks/useObras';
import {
  type PackageFormData,
  type Specialty,
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
  });

  useEffect(() => {
    if (defaultObraId) setForm(f => ({ ...f, obra_id: defaultObraId }));
  }, [defaultObraId]);

  const set = (key: keyof PackageFormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <Button type="submit" disabled={loading || !form.obra_id}>
              {loading ? 'A criar...' : 'Criar Pacote'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
