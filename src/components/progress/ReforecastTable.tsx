import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import type { TaskReforecast } from '@/types/schedule';

interface Props {
  obraId: string;
}

export function ReforecastTable({ obraId }: Props) {
  const { user } = useAuth();

  const { data: reforecasts } = useQuery({
    queryKey: ['task-reforecasts', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_reforecast')
        .select(`
          *,
          task:project_schedule_tasks(id, name, wbs_code)
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as (TaskReforecast & { task?: { id: string; name: string; wbs_code: string | null } })[];
    },
    enabled: !!user && !!obraId,
  });

  const classificationColors: Record<string, string> = {
    recoverable: 'bg-amber-100 text-amber-800',
    structural: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const classificationLabels: Record<string, string> = {
    recoverable: 'Recuperável',
    structural: 'Estrutural',
    critical: 'Crítico',
  };

  if (!reforecasts?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Reforecasts Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead>Fim anterior</TableHead>
              <TableHead>Novo fim</TableHead>
              <TableHead className="text-center">Δ Dias</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reforecasts.map(r => {
              const delayDays = r.new_forecast_end && r.previous_forecast_end
                ? Math.ceil((new Date(r.new_forecast_end).getTime() - new Date(r.previous_forecast_end).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

              return (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">
                    {r.task?.name || 'Tarefa'}
                    {r.task?.wbs_code && (
                      <span className="text-xs text-muted-foreground ml-1">({r.task.wbs_code})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.previous_forecast_end ? format(new Date(r.previous_forecast_end), 'dd/MM/yy') : '-'}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {r.new_forecast_end ? format(new Date(r.new_forecast_end), 'dd/MM/yy') : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {delayDays > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">+{delayDays}d</Badge>
                    ) : delayDays < 0 ? (
                      <Badge className="text-[10px] bg-green-100 text-green-800">{delayDays}d</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.delay_classification && (
                      <Badge className={`text-[10px] ${classificationColors[r.delay_classification] || ''}`}>
                        {classificationLabels[r.delay_classification] || r.delay_classification}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), 'dd/MM HH:mm')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
