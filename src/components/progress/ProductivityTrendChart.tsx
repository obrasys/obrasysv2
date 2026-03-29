import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface Props {
  obraId: string;
}

interface ProductivityRecord {
  id: string;
  schedule_task_id: string;
  reference_date: string;
  planned_productivity: number;
  actual_productivity: number;
  average_actual_productivity: number;
}

export function ProductivityTrendChart({ obraId }: Props) {
  const { user } = useAuth();

  const { data: records } = useQuery({
    queryKey: ['productivity-history', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_productivity_history')
        .select('*')
        .eq('obra_id', obraId)
        .order('reference_date', { ascending: true })
        .limit(60);
      if (error) throw error;
      return data as ProductivityRecord[];
    },
    enabled: !!user && !!obraId,
  });

  // Aggregate by date
  const byDate = new Map<string, { planned: number; actual: number; count: number }>();
  (records || []).forEach(r => {
    const key = r.reference_date;
    const existing = byDate.get(key) || { planned: 0, actual: 0, count: 0 };
    existing.planned += r.planned_productivity;
    existing.actual += r.actual_productivity;
    existing.count += 1;
    byDate.set(key, existing);
  });

  const chartData = Array.from(byDate.entries()).map(([date, vals]) => ({
    date: format(new Date(date), 'dd/MM'),
    planeada: vals.count > 0 ? Number((vals.planned / vals.count).toFixed(2)) : 0,
    real: vals.count > 0 ? Number((vals.actual / vals.count).toFixed(2)) : 0,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendência de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Os dados de produtividade serão registados à medida que as RDOs forem processadas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Tendência de Produtividade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toFixed(2),
                  name === 'planeada' ? 'Planeada' : 'Real',
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="planeada" fill="hsl(var(--primary))" opacity={0.4} name="Planeada" radius={[2, 2, 0, 0]} />
              <Bar dataKey="real" fill="hsl(142, 71%, 45%)" name="Real" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
