import { useMemo } from 'react';
import { format, parseISO, differenceInDays, isPast, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle, Clock, Bell, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PaymentPlan {
  id: string;
  label: string;
  amount: number;
  due_date: string;
  status: string;
  installment_no: number;
  percent_of_award: number;
}

interface PortalPaymentAlertsCardProps {
  payments: PaymentPlan[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

export function PortalPaymentAlertsCard({ payments }: PortalPaymentAlertsCardProps) {
  const { overdue, dueSoon } = useMemo(() => {
    const today = new Date();
    const overdueItems: (PaymentPlan & { daysLate: number })[] = [];
    const dueSoonItems: (PaymentPlan & { daysUntil: number })[] = [];

    payments.forEach((p) => {
      if (p.status === 'paid') return;
      const due = parseISO(p.due_date);
      const diff = differenceInDays(due, today);

      if (isPast(due) && !isToday(due)) {
        overdueItems.push({ ...p, daysLate: Math.abs(diff) });
      } else if (diff <= 7) {
        dueSoonItems.push({ ...p, daysUntil: diff });
      }
    });

    return {
      overdue: overdueItems.sort((a, b) => b.daysLate - a.daysLate),
      dueSoon: dueSoonItems.sort((a, b) => a.daysUntil - b.daysUntil),
    };
  }, [payments]);

  const totalAlerts = overdue.length + dueSoon.length;
  if (totalAlerts === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-base">
          <Bell className="w-5 h-5" />
          Alertas de Pagamento
          <Badge variant="destructive" className="ml-auto">
            {totalAlerts}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {overdue.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5"
          >
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{p.label}</p>
              <p className="text-xs text-muted-foreground">
                Em atraso há {p.daysLate} dia{p.daysLate !== 1 ? 's' : ''}
                {' · '}
                Venceu em {format(parseISO(p.due_date), 'dd/MM/yyyy')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-sm text-destructive">
                {formatCurrency(p.amount)}
              </p>
              <Badge variant="destructive" className="text-xs">
                Em atraso
              </Badge>
            </div>
          </div>
        ))}

        {dueSoon.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-amber-300 bg-amber-100/50 dark:bg-amber-900/20"
          >
            <div className="p-2 rounded-full bg-amber-200/50">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{p.label}</p>
              <p className="text-xs text-muted-foreground">
                {p.daysUntil === 0
                  ? 'Vence hoje'
                  : `Vence em ${p.daysUntil} dia${p.daysUntil !== 1 ? 's' : ''}`}
                {' · '}
                {format(parseISO(p.due_date), 'dd/MM/yyyy')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-sm text-amber-700">
                {formatCurrency(p.amount)}
              </p>
              <Badge variant="outline" className="text-xs">
                A vencer
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
