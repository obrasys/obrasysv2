import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFinancialMilestones, useFinancialAlerts } from '@/hooks/useFinancialMilestones';
import { MILESTONE_TYPE_LABELS } from '@/types/financial-milestones';
import { AlertsPanel } from './AlertsPanel';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useFormatting } from '@/hooks/useFormatting';

interface Props {
  obraId: string;
}

export function MilestonesTimeline({ obraId }: Props) {
  const { milestones, isLoading, receipts, payments, totalPlanned, totalActual } = useFinancialMilestones(obraId);
  const { formatCurrency } = useFormatting();

  const statusColors: Record<string, string> = {
    planned: 'bg-blue-100 text-blue-800',
    forecasted: 'bg-amber-100 text-amber-800',
    triggered: 'bg-green-100 text-green-800',
    completed: 'bg-green-200 text-green-900',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  const statusLabels: Record<string, string> = {
    planned: 'Planeado',
    forecasted: 'Previsto',
    triggered: 'Ativado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Recebimentos previstos</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(receipts.reduce((s, m) => s + (m.planned_amount || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Pagamentos previstos</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(payments.reduce((s, m) => s + (m.planned_amount || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total planeado</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalPlanned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Marcos</span>
            </div>
            <p className="text-lg font-bold">{milestones?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Marcos Financeiros</CardTitle>
            <Button size="sm" variant="outline" disabled>
              <Plus className="h-3 w-3 mr-1" />
              Novo marco
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data prevista</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">A carregar...</TableCell>
                </TableRow>
              ) : !milestones?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Sem marcos financeiros registados.
                  </TableCell>
                </TableRow>
              ) : (
                milestones.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {MILESTONE_TYPE_LABELS[m.milestone_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.planned_date ? format(new Date(m.planned_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(m.planned_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[m.status]}`}>
                        {statusLabels[m.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alerts */}
      <AlertsPanel obraId={obraId} />
    </div>
  );
}
