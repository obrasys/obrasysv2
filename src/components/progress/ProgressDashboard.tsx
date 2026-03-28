import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Clock, AlertTriangle, Activity } from 'lucide-react';
import { useProjectProgress } from '@/hooks/useProjectProgress';
import { ProgressCurveChart } from './ProgressCurveChart';
import { TaskSemaphoreTable } from './TaskSemaphoreTable';

interface Props {
  obraId: string;
  versionId?: string;
}

export function ProgressDashboard({ obraId, versionId }: Props) {
  const { progress, spi, criticalTasks, maxDelay, healthStatus, snapshots, allTasks } = useProjectProgress(obraId, versionId);

  const healthColors: Record<string, string> = {
    on_track: 'bg-green-100 text-green-800 border-green-300',
    at_risk: 'bg-amber-100 text-amber-800 border-amber-300',
    delayed: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
  };

  const healthLabels: Record<string, string> = {
    on_track: 'No prazo',
    at_risk: 'Em risco',
    delayed: 'Atrasada',
    critical: 'Crítica',
  };

  if (!versionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Aprove uma baseline de cronograma para ver o controlo de progresso.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Previsto</span>
            </div>
            <p className="text-2xl font-bold">{progress.planned.toFixed(1)}%</p>
            <Progress value={progress.planned} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Real</span>
            </div>
            <p className={`text-2xl font-bold ${progress.actual >= progress.planned ? 'text-green-600' : 'text-red-600'}`}>
              {progress.actual.toFixed(1)}%
            </p>
            <Progress value={progress.actual} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {progress.deviation >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs text-muted-foreground">Desvio</span>
            </div>
            <p className={`text-2xl font-bold ${progress.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {progress.deviation > 0 ? '+' : ''}{progress.deviation.toFixed(1)}%
            </p>
            <Badge variant="outline" className={`mt-2 text-[10px] ${healthColors[healthStatus]}`}>
              {healthLabels[healthStatus]}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">SPI</span>
            </div>
            <p className={`text-2xl font-bold ${spi >= 0.95 ? 'text-green-600' : spi >= 0.85 ? 'text-amber-600' : 'text-red-600'}`}>
              {spi.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {maxDelay > 0 ? `${maxDelay} dias de atraso máx.` : 'Sem atrasos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical tasks alert */}
      {criticalTasks.length > 0 && (
        <Card className="border-amber-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">{criticalTasks.length} atividade(s) crítica(s) ou atrasada(s)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress curve chart */}
      <ProgressCurveChart snapshots={snapshots || []} />

      {/* Task semaphore table */}
      <TaskSemaphoreTable tasks={allTasks || []} />
    </div>
  );
}
