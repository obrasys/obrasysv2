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
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600',
      emptyPositive: false,
    },
    {
      label: 'Obras em Risco',
      value: String(obrasEmRisco).padStart(2, '0'),
      subtitle: obrasEmRisco > 0 ? 'atenção imediata' : 'Excelente! Nenhuma obra em risco',
      icon: AlertTriangle,
      iconBg: obrasEmRisco > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: obrasEmRisco > 0 ? 'text-red-600' : 'text-emerald-600',
      emptyPositive: obrasEmRisco === 0,
    },
    {
      label: 'Receber Esta Semana',
      value: formatCurrency(receberSemana),
      subtitle: receberSemana === 0 ? 'Sem cobranças esta semana' : 'a cobrar',
      icon: Wallet,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600',
      emptyPositive: false,
    },
    {
      label: 'Medições Pendentes',
      value: String(medicoesPendentes).padStart(2, '0'),
      subtitle: medicoesPendentes === 0 ? 'Tudo validado. Bom trabalho!' : 'aguardando validação',
      icon: ClipboardCheck,
      iconBg: medicoesPendentes > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: medicoesPendentes > 0 ? 'text-amber-600' : 'text-emerald-600',
      emptyPositive: medicoesPendentes === 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <p className={`text-xs ${kpi.emptyPositive ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
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
