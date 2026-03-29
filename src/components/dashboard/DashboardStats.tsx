import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Users } from 'lucide-react';
import type { Obra } from '@/types/obras';
import type { Tarefa } from '@/types/tarefas';
import type { EquipaMembro } from '@/types/recursos';

interface DashboardStatsProps {
  obras: Obra[];
  tarefas: Tarefa[];
  membros: EquipaMembro[];
}

const DONUT_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(0 84% 60%)',
  'hsl(270 60% 55%)',
];

export function DashboardStats({ obras, tarefas, membros }: DashboardStatsProps) {
  const obraStats = useMemo(() => {
    const total = obras?.length || 0;
    const emCurso = obras?.filter(o => o.status === 'em_curso').length || 0;
    const planeamento = obras?.filter(o => o.status === 'planeamento').length || 0;
    const concluidas = obras?.filter(o => o.status === 'concluida').length || 0;
    const pausadas = obras?.filter(o => o.status === 'pausada').length || 0;
    const progressoMedio = emCurso > 0
      ? obras.filter(o => o.status === 'em_curso').reduce((s, o) => s + (o.progresso || 0), 0) / emCurso
      : 0;

    return [
      { label: 'Em Curso', value: emCurso, pct: total ? (emCurso / total) * 100 : 0, color: 'bg-primary' },
      { label: 'Planeamento', value: planeamento, pct: total ? (planeamento / total) * 100 : 0, color: 'bg-blue-400' },
      { label: 'Concluídas', value: concluidas, pct: total ? (concluidas / total) * 100 : 0, color: 'bg-emerald-500' },
      { label: 'Pausadas', value: pausadas, pct: total ? (pausadas / total) * 100 : 0, color: 'bg-amber-500' },
      { label: 'Progresso Médio', value: Math.round(progressoMedio), pct: progressoMedio, color: 'bg-primary' },
    ];
  }, [obras]);

  const tarefaDonutData = useMemo(() => {
    const counts: Record<string, number> = {
      pendente: 0,
      em_progresso: 0,
      concluida: 0,
      cancelada: 0,
      bloqueada: 0,
    };
    tarefas?.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });

    return [
      { name: 'Pendente', value: counts.pendente },
      { name: 'Em Progresso', value: counts.em_progresso },
      { name: 'Concluída', value: counts.concluida },
      { name: 'Cancelada', value: counts.cancelada },
      { name: 'Bloqueada', value: counts.bloqueada },
    ].filter(d => d.value > 0);
  }, [tarefas]);

  const totalTarefas = tarefas?.length || 0;
  const activeMembros = membros?.filter(m => m.ativo).slice(0, 6) || [];

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Progress Bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Estatísticas das Obras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {obraStats.map((stat) => (
            <div key={stat.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="font-semibold">
                  {stat.label === 'Progresso Médio' ? `${stat.value}%` : stat.value}
                </span>
              </div>
              <Progress value={stat.pct} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Donut Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Tarefas por Estado
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {tarefaDonutData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={tarefaDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {tarefaDonutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {tarefaDonutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <PieChartIcon className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Sem tarefas registadas</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">{totalTarefas} tarefas no total</p>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipa Ativa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeMembros.length > 0 ? (
            activeMembros.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  {m.foto_url && <AvatarImage src={m.foto_url} alt={m.nome} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {m.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.cargo || 'Sem cargo'}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {m.obra_atual?.nome ? m.obra_atual.nome.slice(0, 12) : 'Disponível'}
                </Badge>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Sem membros registados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
