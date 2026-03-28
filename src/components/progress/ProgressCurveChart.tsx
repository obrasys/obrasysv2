import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { ProjectProgressSnapshot } from '@/types/schedule';
import { format } from 'date-fns';

interface Props {
  snapshots: ProjectProgressSnapshot[];
}

export function ProgressCurveChart({ snapshots }: Props) {
  const chartData = snapshots.map(s => ({
    date: format(new Date(s.snapshot_date), 'dd/MM'),
    previsto: Number(s.planned_global_progress.toFixed(1)),
    real: Number(s.actual_global_progress.toFixed(1)),
    projetado: Number(s.projected_global_progress.toFixed(1)),
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Curva de Progresso</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Os dados da curva S serão gerados à medida que as RDOs forem aprovadas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Curva Previsto vs Real vs Projetado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(value: number) => [`${value}%`]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="previsto" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" name="Previsto" />
              <Area type="monotone" dataKey="real" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} strokeWidth={2} name="Real" />
              <Area type="monotone" dataKey="projetado" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="3 3" name="Projetado" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
