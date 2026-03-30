import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { SPECIALTY_LABELS, type Specialty } from '@/types/instalacoes';
import { useState } from 'react';
import { Zap, Droplets, Wifi, Settings2, Save, RotateCcw, Loader2 } from 'lucide-react';

const SPECIALTY_ICONS: Record<Specialty, React.ElementType> = {
  electrical: Zap,
  plumbing: Droplets,
  telecom: Wifi,
};

const SPECIALTY_COLORS: Record<Specialty, string> = {
  electrical: 'text-amber-600',
  plumbing: 'text-blue-600',
  telecom: 'text-violet-600',
};

export function CoefficientsEditor() {
  const { coefficients, coefficientsLoading, initCoefficients, updateCoefficient } = useInstalacoes();
  const [editing, setEditing] = useState<Record<string, number>>({});

  if (coefficientsLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (coefficients.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
              <Settings2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Coeficientes não configurados</p>
              <p className="text-sm text-muted-foreground mt-1">
                Inicialize os coeficientes paramétricos para personalizar os cálculos da sua empresa.
              </p>
            </div>
            <Button onClick={() => initCoefficients.mutate()} disabled={initCoefficients.isPending} className="gap-1.5">
              {initCoefficients.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {initCoefficients.isPending ? 'A inicializar...' : 'Inicializar com Valores Padrão'}
            </Button>
          </CardContent>
        </Card>
      </div>
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

  const hasEdits = Object.keys(editing).length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs defaultValue={Object.keys(grouped)[0]} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
          {(Object.keys(grouped) as Specialty[]).map(spec => {
            const Icon = SPECIALTY_ICONS[spec];
            return (
              <TabsTrigger key={spec} value={spec} className="gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${SPECIALTY_COLORS[spec]}`} />
                <span className="hidden sm:inline">{SPECIALTY_LABELS[spec]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.entries(grouped) as [Specialty, typeof coefficients][]).map(([spec, items]) => {
          const Icon = SPECIALTY_ICONS[spec];
          return (
            <TabsContent key={spec} value={spec} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${SPECIALTY_COLORS[spec]}`} />
                    Coeficientes de {SPECIALTY_LABELS[spec]}
                    <Badge variant="outline" className="text-[10px] ml-auto">{items.length} parâmetros</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {items.map(c => {
                      const isEdited = editing[c.id] !== undefined;
                      return (
                        <div key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{c.description ?? c.coefficient_key}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{c.coefficient_key}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              className={`w-24 text-right tabular-nums ${isEdited ? 'border-primary ring-1 ring-primary/20' : ''}`}
                              value={editing[c.id] ?? c.value_numeric}
                              onChange={e => setEditing(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                            />
                            {isEdited && (
                              <Button size="sm" variant="default" onClick={() => handleSave(c.id)} className="gap-1 h-8 px-2.5">
                                <Save className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
