import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Award } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';

interface PaymentPlan {
  id: string;
  label: string;
  amount: number;
  due_date: string;
  status: string;
  installment_no: number;
  percent_of_award: number;
}

interface BudgetAward {
  id: string;
  awarded_total_amount: number;
  awarded_at: string;
  deposit_amount: number;
  deposit_percent: number;
  remaining_amount: number;
  status: string;
}

interface PortalPaymentsCardProps {
  payments: PaymentPlan[];
  awards?: BudgetAward[];
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  paid: {
    label: 'Pago',
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    badgeClass: 'bg-green-100 text-green-700',
  },
  pending: {
    label: 'Pendente',
    icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    badgeClass: 'bg-muted text-muted-foreground',
  },
  overdue: {
    label: 'Vencido',
    icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    badgeClass: 'bg-destructive/10 text-destructive',
  },
};

function getEffectiveStatus(payment: PaymentPlan): string {
  if (payment.status === 'paid') return 'paid';
  const due = new Date(payment.due_date);
  if (isPast(due) && !isToday(due)) return 'overdue';
  return 'pending';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function PortalPaymentsCard({ payments, awards = [] }: PortalPaymentsCardProps) {
  const award = awards.length > 0 ? awards[0] : null;
  const depositPaid = award && award.deposit_amount > 0 ? award.deposit_amount : 0;
  const installmentsPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = depositPaid + installmentsPaid;
  const totalAmount = depositPaid + payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter(p => getEffectiveStatus(p) !== 'paid');
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const nextPayment = pendingPayments[0];

  if (payments.length === 0 && !award) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-10 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Ainda não existem parcelas definidas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Award + Summary */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          {/* Awarded value */}
          {award && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Valor Adjudicado</h3>
                  <p className="text-xs text-muted-foreground">
                    Adjudicado em {format(new Date(award.awarded_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 mb-4">
                <p className="text-2xl font-bold text-primary">{formatCurrency(award.awarded_total_amount)}</p>
                {award.deposit_amount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sinal: {formatCurrency(award.deposit_amount)} ({award.deposit_percent}%)
                  </p>
                )}
              </div>

              <Separator className="my-4" />
            </>
          )}

          {/* Payment plan summary */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Plano de Pagamentos</h3>
              <p className="text-xs text-muted-foreground">
                {payments.filter(p => p.status === 'paid').length} de {payments.length} parcelas pagas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-0.5">Total</p>
              <p className="text-base font-bold text-foreground">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <p className="text-xs text-muted-foreground mb-0.5">Pago</p>
              <p className="text-base font-bold text-green-700">{formatCurrency(paidAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50">
              <p className="text-xs text-muted-foreground mb-0.5">Em falta</p>
              <p className="text-base font-bold text-amber-700">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>

          {nextPayment && (
            <>
              <Separator className="my-4" />
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1">Próximo pagamento</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{nextPayment.label}</span>
                  <span className="text-sm font-bold text-primary">{formatCurrency(nextPayment.amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vencimento: {format(new Date(nextPayment.due_date), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment list */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Detalhe das Parcelas</h3>
          <div className="space-y-2">
            {payments.map((payment) => {
              const effectiveStatus = getEffectiveStatus(payment);
              const config = statusConfig[effectiveStatus] || statusConfig.pending;
              const isPaid = effectiveStatus === 'paid';

              return (
                <div
                  key={payment.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isPaid ? 'bg-green-50/50 border-green-200' :
                    effectiveStatus === 'overdue' ? 'bg-destructive/5 border-destructive/20' :
                    'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="text-sm font-medium text-foreground">{payment.label}</span>
                    </div>
                    <Badge variant="secondary" className={`text-[11px] ${config.badgeClass}`}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pl-6">
                    <span className="text-xs text-muted-foreground">
                      Vencimento: {format(new Date(payment.due_date), 'dd/MM/yyyy')}
                    </span>
                    <span className={`text-sm font-semibold ${isPaid ? 'text-green-700' : 'text-foreground'}`}>
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
