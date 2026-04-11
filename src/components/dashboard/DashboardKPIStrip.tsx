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
      bg: 'bg-[hsl(192,73%,21%)]',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subtitleColor: 'text-white/70',
      emptyPositive: false,
    },
    {
      label: 'Obras em Risco',
      value: String(obrasEmRisco).padStart(2, '0'),
      subtitle: obrasEmRisco > 0 ? 'atenção imediata' : 'Excelente! Nenhuma obra em risco',
      icon: AlertTriangle,
      bg: obrasEmRisco > 0 ? 'bg-[hsl(20,88%,40%)]' : 'bg-[hsl(146,50%,36%)]',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subtitleColor: 'text-white/70',
      emptyPositive: obrasEmRisco === 0,
    },
    {
      label: 'Receber Esta Semana',
      value: formatCurrency(receberSemana),
      subtitle: receberSemana === 0 ? 'Sem cobranças esta semana' : 'a cobrar',
      icon: Wallet,
      bg: 'bg-[hsl(195,62%,28%)]',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subtitleColor: 'text-white/70',
      emptyPositive: false,
    },
    {
      label: 'Medições Pendentes',
      value: String(medicoesPendentes).padStart(2, '0'),
      subtitle: medicoesPendentes === 0 ? 'Tudo validado. Bom trabalho!' : 'aguardando validação',
      icon: ClipboardCheck,
      bg: medicoesPendentes > 0 ? 'bg-[hsl(38,92%,44%)]' : 'bg-[hsl(146,50%,36%)]',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      subtitleColor: 'text-white/70',
      emptyPositive: medicoesPendentes === 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className={`rounded-xl shadow-card hover:shadow-card-hover transition-shadow border-0 ${kpi.bg}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className={`text-xs font-medium uppercase tracking-wide ${kpi.subtitleColor}`}>{kpi.label}</p>
                <p className={`text-3xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
                <p className={`text-xs ${kpi.subtitleColor}`}>
                  {kpi.subtitle}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.textColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
