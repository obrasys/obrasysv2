import { Card, CardContent } from '@/components/ui/card';
import { Building2, AlertTriangle, Wallet, ClipboardCheck } from 'lucide-react';

interface KPIStripProps {
  obrasAtivas: number;
  obrasEmRisco: number;
  receberSemana: number;
  medicoesPendentes: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export function DashboardKPIStrip({ obrasAtivas, obrasEmRisco, receberSemana, medicoesPendentes }: KPIStripProps) {
  const kpis = [
    {
      label: 'Obras Ativas',
      value: String(obrasAtivas).padStart(2, '0'),
      subtitle: obrasAtivas === 0 ? 'Crie a sua primeira obra para começar' : 'em execução',
      icon: Building2,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      emptyPositive: false,
    },
    {
      label: 'Obras em Risco',
      value: String(obrasEmRisco).padStart(2, '0'),
      subtitle: obrasEmRisco > 0 ? 'atenção imediata' : 'Excelente! Nenhuma obra em risco',
      icon: AlertTriangle,
      iconBg: obrasEmRisco > 0 ? 'bg-destructive/10' : 'bg-success/10',
      iconColor: obrasEmRisco > 0 ? 'text-destructive' : 'text-success',
      emptyPositive: obrasEmRisco === 0,
    },
    {
      label: 'Receber Esta Semana',
      value: formatCurrency(receberSemana),
      subtitle: receberSemana === 0 ? 'Sem cobranças esta semana' : 'a cobrar',
      icon: Wallet,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      emptyPositive: false,
    },
    {
      label: 'Medições Pendentes',
      value: String(medicoesPendentes).padStart(2, '0'),
      subtitle: medicoesPendentes === 0 ? 'Tudo validado. Bom trabalho!' : 'aguardando validação',
      icon: ClipboardCheck,
      iconBg: medicoesPendentes > 0 ? 'bg-warning/10' : 'bg-success/10',
      iconColor: medicoesPendentes > 0 ? 'text-warning' : 'text-success',
      emptyPositive: medicoesPendentes === 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="rounded-xl shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <p className={`text-xs ${kpi.emptyPositive ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                  {kpi.subtitle}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
