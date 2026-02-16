import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InstallationPackage } from '@/types/instalacoes';
import { useFormatting } from '@/hooks/useFormatting';

interface Props {
  pkg: InstallationPackage;
}

export function EstimativasCard({ pkg }: Props) {
  const { formatCurrency } = useFormatting();
  const pointsFinal = pkg.points_final ?? pkg.points_estimated;
  const linearFinal = pkg.linear_m_final ?? pkg.linear_m_estimated;
  const isManual = pkg.points_final !== null || pkg.linear_m_final !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Estimativas
          {isManual && <Badge variant="outline" className="text-xs">Ajustado manualmente</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            <p className="text-2xl font-bold">{formatCurrency(Number(pkg.total_cost_estimated))}</p>
            <p className="text-xs text-muted-foreground">Custo estimado</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {pointsFinal > 0 ? formatCurrency(Number(pkg.total_cost_estimated) / pointsFinal) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Custo/ponto</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
