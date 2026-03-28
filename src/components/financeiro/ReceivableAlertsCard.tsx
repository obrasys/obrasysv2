import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  AlertTriangle,
  Clock,
  CircleDollarSign,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReceivableAlerts, type ReceivableWithAlert } from '@/hooks/useReceivableAlerts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

interface ReceivableAlertsCardProps {
  obraId?: string;
}

export function ReceivableAlertsCard({ obraId }: ReceivableAlertsCardProps) {
  const navigate = useNavigate();
  const { dueSoon, overdue, isLoading } = useReceivableAlerts(obraId);

  if (isLoading || (dueSoon.length === 0 && overdue.length === 0)) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Bell className="w-5 h-5" />
          Alertas de Vencimento
          <Badge variant="destructive" className="ml-auto">
            {dueSoon.length + overdue.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdue.map(r => (
          <AlertItem key={r.id} receivable={r} type="overdue" />
        ))}
        {dueSoon.map(r => (
          <AlertItem key={r.id} receivable={r} type="due_soon" />
        ))}
      </CardContent>
    </Card>
  );
}

function AlertItem({ receivable, type }: { receivable: ReceivableWithAlert; type: 'overdue' | 'due_soon' }) {
  const today = new Date();
  const dueDate = parseISO(receivable.due_date);
  const daysUntil = differenceInDays(dueDate, today);

  const isOverdue = type === 'overdue';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      isOverdue 
        ? 'border-destructive/30 bg-destructive/5' 
        : 'border-amber-300 bg-amber-100/50 dark:bg-amber-900/20'
    }`}>
      <div className={`p-2 rounded-full ${isOverdue ? 'bg-destructive/10' : 'bg-amber-200/50'}`}>
        {isOverdue ? (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        ) : (
          <Clock className="w-4 h-4 text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{receivable.title}</p>
        <p className="text-xs text-muted-foreground">
          {isOverdue
            ? `Em atraso há ${Math.abs(daysUntil)} dia${Math.abs(daysUntil) !== 1 ? 's' : ''}`
            : daysUntil === 0
            ? 'Vence hoje'
            : `Vence em ${daysUntil} dia${daysUntil !== 1 ? 's' : ''}`}
          {' · '}
          {format(dueDate, "dd/MM/yyyy")}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-semibold text-sm ${isOverdue ? 'text-destructive' : 'text-amber-700'}`}>
          {formatCurrency(receivable.remaining_amount || receivable.amount)}
        </p>
        <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-xs">
          {isOverdue ? 'Em atraso' : 'A vencer'}
        </Badge>
      </div>
    </div>
  );
}
