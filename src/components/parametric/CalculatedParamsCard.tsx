import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, Lock } from 'lucide-react';
import type { CalculatedParameter, CalculatedParameterKey } from '@/types/parametric';
import { CALCULATED_PARAM_LABELS } from '@/types/parametric';

interface CalculatedParamsCardProps {
  params: CalculatedParameter[];
  isLoading?: boolean;
}

export function CalculatedParamsCard({ params, isLoading }: CalculatedParamsCardProps) {
  const formatValue = (value: number, unit: string) => {
    if (unit === 'un') return value.toString();
    return value.toFixed(unit === 'm3' ? 4 : 2);
  };

  // Ordenar parâmetros para exibição consistente
  const orderedKeys: CalculatedParameterKey[] = [
    'gross_area_m2',
    'openings_area_m2',
    'net_area_m2',
    'volume_m3',
    'layer_count',
    'wall_side_count',
  ];

  const sortedParams = orderedKeys
    .map((key) => params.find((p) => p.key === key))
    .filter((p): p is CalculatedParameter => !!p);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Parâmetros Calculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (params.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Parâmetros Calculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecione um elemento para ver os parâmetros calculados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Parâmetros Calculados
          <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedParams.map((param) => {
            const config = CALCULATED_PARAM_LABELS[param.key];
            const isMainArea = param.key === 'net_area_m2';
            const isMainVolume = param.key === 'volume_m3';

            return (
              <div
                key={param.id}
                className={`flex items-center justify-between p-2 rounded-md ${
                  isMainArea || isMainVolume
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/50'
                }`}
              >
                <span
                  className={`text-sm ${isMainArea || isMainVolume ? 'font-medium' : ''}`}
                >
                  {config.label}
                </span>
                <span
                  className={`font-mono ${
                    isMainArea || isMainVolume ? 'text-lg font-semibold' : 'text-sm'
                  }`}
                >
                  {formatValue(param.value, param.unit)}{' '}
                  <span className="text-muted-foreground text-xs">{config.unit}</span>
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Valores calculados automaticamente - não editáveis
        </p>
      </CardContent>
    </Card>
  );
}
