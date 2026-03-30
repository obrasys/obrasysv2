import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X, CircleDot, Ruler, Euro, Calculator } from 'lucide-react';
import type { InstallationPackage } from '@/types/instalacoes';
import { useFormatting } from '@/hooks/useFormatting';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  pkg: InstallationPackage;
}

export function EstimativasCard({ pkg }: Props) {
  const { formatCurrency } = useFormatting();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [points, setPoints] = useState(pkg.points_final ?? pkg.points_estimated);
  const [linearM, setLinearM] = useState(pkg.linear_m_final ?? pkg.linear_m_estimated);
  const [totalCost, setTotalCost] = useState(Number(pkg.total_cost_estimated));

  const pointsFinal = editing ? points : (pkg.points_final ?? pkg.points_estimated);
  const linearFinal = editing ? linearM : (pkg.linear_m_final ?? pkg.linear_m_estimated);
  const costFinal = editing ? totalCost : Number(pkg.total_cost_estimated);
  const isManual = pkg.points_final !== null || pkg.linear_m_final !== null;

  const handleSave = async () => {
    const { error } = await supabase
      .from('installations_packages' as any)
      .update({
        points_final: points,
        linear_m_final: linearM,
        total_cost_estimated: totalCost,
      } as any)
      .eq('id', pkg.id);

    if (error) {
      toast.error('Erro ao guardar alterações');
      return;
    }
    toast.success('Estimativas atualizadas');
    qc.invalidateQueries({ queryKey: ['installations_packages'] });
    setEditing(false);
  };

  const handleCancel = () => {
    setPoints(pkg.points_final ?? pkg.points_estimated);
    setLinearM(pkg.linear_m_final ?? pkg.linear_m_estimated);
    setTotalCost(Number(pkg.total_cost_estimated));
    setEditing(false);
  };

  const metrics = [
    { icon: CircleDot, label: 'Pontos', value: pointsFinal, color: 'text-amber-600 bg-amber-500/10' },
    { icon: Ruler, label: 'Metros lineares', value: `${linearFinal} m`, color: 'text-blue-600 bg-blue-500/10' },
    { icon: Euro, label: 'Custo estimado', value: formatCurrency(costFinal), color: 'text-emerald-600 bg-emerald-500/10' },
    { icon: Calculator, label: 'Custo/ponto', value: pointsFinal > 0 ? formatCurrency(costFinal / pointsFinal) : '—', color: 'text-violet-600 bg-violet-500/10' },
  ];

  if (editing) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">Editar Estimativas</h4>
            {isManual && <Badge variant="outline" className="text-[10px]">Ajustado</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleSave} className="gap-1 text-emerald-600 hover:text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Guardar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1 text-destructive">
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pontos</Label>
            <Input type="number" min={0} value={points} onChange={e => setPoints(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Metros lineares</Label>
            <Input type="number" min={0} value={linearM} onChange={e => setLinearM(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Custo estimado (€)</Label>
            <Input type="number" min={0} step="0.01" value={totalCost} onChange={e => setTotalCost(Number(e.target.value))} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isManual && <Badge variant="outline" className="text-[10px]">Ajustado manualmente</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-muted-foreground">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(({ icon: MIcon, label, value, color }) => (
          <div key={label} className="rounded-lg border p-3 text-center space-y-1">
            <div className={`mx-auto h-8 w-8 rounded-lg ${color} flex items-center justify-center`}>
              <MIcon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
