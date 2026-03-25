import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { parseISO, getMonth, getYear } from 'date-fns';
import type { Obra } from '@/types/obras';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface DashboardChartsProps {
  rdos: any[];
  obras: Obra[];
}

export function DashboardCharts({ rdos, obras }: DashboardChartsProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const rdoChartData = useMemo(() => {
    const year = parseInt(selectedYear);
    const months = MONTH_LABELS.map((label, i) => ({
      name: label,
      total: 0,
      aprovados: 0,
      submetidos: 0,
    }));

    rdos?.forEach(rdo => {
      try {
        const date = parseISO(rdo.data);
        if (getYear(date) === year) {
          const m = getMonth(date);
          months[m].total++;
          if (rdo.status === 'aprovado') months[m].aprovados++;
          if (rdo.status === 'submetido') months[m].submetidos++;
        }
      } catch {}
    });

    return months;
  }, [rdos, selectedYear]);

  const obrasChartData = useMemo(() => {
    const year = parseInt(selectedYear);
    const months = MONTH_LABELS.map((label) => ({
      name: label,
      total: 0,
      concluidas: 0,
    }));

    obras?.forEach(obra => {
      try {
        const date = parseISO(obra.created_at);
        if (getYear(date) === year) {
          const m = getMonth(date);
          months[m].total++;
          if (obra.status === 'concluida') months[m].concluidas++;
        }
      } catch {}
    });

    return months;
  }, [obras, selectedYear]);

  const years = [String(currentYear - 1), String(currentYear), String(currentYear + 1)];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* RDOs Bar Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Diários de Obra (RDOs)</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rdoChartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[3, 3, 0, 0]} />
              <Bar dataKey="aprovados" fill="hsl(142 71% 45%)" name="Aprovados" radius={[3, 3, 0, 0]} />
              <Bar dataKey="submetidos" fill="hsl(38 92% 50%)" name="Submetidos" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Obras Line Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Obras</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={obrasChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Criadas" />
              <Line type="monotone" dataKey="concluidas" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} name="Concluídas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
