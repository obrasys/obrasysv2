import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X } from 'lucide-react';
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          Estimativas
          {isManual && !editing && <Badge variant="outline" className="text-xs">Ajustado manualmente</Badge>}
        </CardTitle>
        <div className="flex gap-1">
          {editing ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleSave}><Check className="h-4 w-4 text-green-600" /></Button>
              <Button variant="ghost" size="icon" onClick={handleCancel}><X className="h-4 w-4 text-destructive" /></Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Pontos</Label>
              <Input type="number" min={0} value={points} onChange={e => setPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Metros lineares</Label>
              <Input type="number" min={0} value={linearM} onChange={e => setLinearM(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Custo estimado (€)</Label>
              <Input type="number" min={0} step="0.01" value={totalCost} onChange={e => setTotalCost(Number(e.target.value))} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{pointsFinal}</p>
              <p className="text-xs text-muted-foreground">Pontos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{linearFinal}</p>
              <p className="text-xs text-muted-foreground">Metros lineares</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(costFinal)}</p>
              <p className="text-xs text-muted-foreground">Custo estimado</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {pointsFinal > 0 ? formatCurrency(costFinal / pointsFinal) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Custo/ponto</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
