import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { SPECIALTY_LABELS, type Specialty } from '@/types/instalacoes';
import { useState } from 'react';

export function CoefficientsEditor() {
  const { coefficients, coefficientsLoading, initCoefficients, updateCoefficient } = useInstalacoes();
  const [editing, setEditing] = useState<Record<string, number>>({});

  if (coefficientsLoading) return <p className="text-muted-foreground">A carregar...</p>;

  if (coefficients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coeficientes Paramétricos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Ainda não tem coeficientes configurados.</p>
          <Button onClick={() => initCoefficients.mutate()} disabled={initCoefficients.isPending}>
            {initCoefficients.isPending ? 'A inicializar...' : 'Inicializar com Valores Padrão'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const grouped = coefficients.reduce<Record<Specialty, typeof coefficients>>((acc, c) => {
    if (!acc[c.specialty]) acc[c.specialty] = [];
    acc[c.specialty].push(c);
    return acc;
  }, {} as any);

  const handleSave = (id: string) => {
    if (editing[id] !== undefined) {
      updateCoefficient.mutate({ id, value_numeric: editing[id] });
      setEditing(e => { const n = { ...e }; delete n[id]; return n; });
    }
  };

  return (
    <div className="space-y-4">
      {(Object.entries(grouped) as [Specialty, typeof coefficients][]).map(([spec, items]) => (
        <Card key={spec}>
          <CardHeader>
            <CardTitle className="text-base">{SPECIALTY_LABELS[spec]}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{c.description ?? c.coefficient_key}</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={editing[c.id] ?? c.value_numeric}
                    onChange={e => setEditing(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                  />
                  {editing[c.id] !== undefined && (
                    <Button size="sm" onClick={() => handleSave(c.id)}>Guardar</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
