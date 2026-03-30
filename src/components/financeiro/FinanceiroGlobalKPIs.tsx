import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface DashboardData {
  totalPagar: number;
  totalReceber: number;
  pagoPagar: number;
  pagoReceber: number;
  saldo: number;
  saldoRealizado: number;
  vencidas: number;
  valorVencido: number;
  aVencer7Dias: number;
  valorAVencer: number;
  contasPorOrigem: {
    mao_de_obra: number;
    material: number;
    outros: number;
  };
}

interface FinanceiroGlobalKPIsProps {
  data?: DashboardData;
  isLoading?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

export function FinanceiroGlobalKPIs({ data, isLoading }: FinanceiroGlobalKPIsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const percentPago = data.totalPagar > 0 ? (data.pagoPagar / data.totalPagar) * 100 : 0;
  const percentRecebido = data.totalReceber > 0 ? (data.pagoReceber / data.totalReceber) * 100 : 0;

  const kpis = [
    {
      label: 'Total a Pagar',
      value: formatCurrency(data.totalPagar),
      valueClass: 'text-destructive',
      icon: ArrowDownRight,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      progress: percentPago,
      progressLabel: 'Pago',
      progressDetail: `${formatCurrency(data.pagoPagar)} pago`,
    },
    {
      label: 'Total a Receber',
      value: formatCurrency(data.totalReceber),
      valueClass: 'text-emerald-600',
      icon: ArrowUpRight,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      progress: percentRecebido,
      progressLabel: 'Recebido',
      progressDetail: `${formatCurrency(data.pagoReceber)} recebido`,
    },
    {
      label: 'Saldo Previsto',
      value: formatCurrency(data.saldo),
      valueClass: data.saldo >= 0 ? 'text-emerald-600' : 'text-destructive',
      icon: Wallet,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      extra: (
        <p className={`text-xs mt-1 ${data.saldoRealizado >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
          {formatCurrency(data.saldoRealizado)} realizado
        </p>
      ),
    },
    {
      label: data.vencidas > 0 ? 'Contas Vencidas' : 'A Vencer (7 dias)',
      value: data.vencidas > 0 ? String(data.vencidas) : String(data.aVencer7Dias),
      valueClass: data.vencidas > 0 ? 'text-destructive' : 'text-amber-600',
      icon: data.vencidas > 0 ? AlertTriangle : Clock,
      iconBg: data.vencidas > 0 ? 'bg-destructive/10' : 'bg-amber-50',
      iconColor: data.vencidas > 0 ? 'text-destructive' : 'text-amber-600',
      highlight: data.vencidas > 0,
      extra: (
        <p className={`text-xs mt-1 ${data.vencidas > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {formatCurrency(data.vencidas > 0 ? data.valorVencido : data.valorAVencer)}
          {data.vencidas > 0 ? ' em atraso' : ''}
        </p>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <Card key={i} className={kpi.highlight ? 'border-destructive/30 bg-destructive/5' : ''}>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${kpi.valueClass}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>

            {kpi.progress !== undefined && (
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{kpi.progressLabel}</span>
                  <span>{Math.round(kpi.progress)}%</span>
                </div>
                <Progress value={kpi.progress} className="h-1" />
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.progressDetail}</p>
              </div>
            )}

            {kpi.extra}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
