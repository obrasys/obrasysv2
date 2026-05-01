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
      iconBg: 'bg-[hsl(192,55%,22%)]/10',
      iconColor: 'text-[hsl(192,55%,22%)]',
    },
    {
      label: 'Obras em Risco',
      value: String(obrasEmRisco).padStart(2, '0'),
      subtitle: obrasEmRisco > 0 ? 'atenção imediata' : 'Tudo em ordem! Sem riscos detetados.',
      icon: AlertTriangle,
      iconBg: obrasEmRisco > 0 ? 'bg-[hsl(20,88%,40%)]/10' : 'bg-[hsl(146,50%,40%)]/10',
      iconColor: obrasEmRisco > 0 ? 'text-[hsl(20,88%,40%)]' : 'text-[hsl(146,50%,40%)]',
    },
    {
      label: 'Pagamentos',
      value: formatCurrency(receberSemana),
      subtitle: receberSemana === 0 ? 'Sem pagamentos esta semana.' : 'a pagar',
      icon: Wallet,
      iconBg: 'bg-[hsl(38,85%,50%)]/10',
      iconColor: 'text-[hsl(38,85%,50%)]',
    },
    {
      label: 'Certificações',
      value: String(medicoesPendentes).padStart(2, '0'),
      subtitle: medicoesPendentes === 0 ? 'Al dia. Criar nova medição?' : 'aguardando validação',
      icon: ClipboardCheck,
      iconBg: 'bg-[hsl(195,55%,30%)]/10',
      iconColor: 'text-[hsl(195,55%,30%)]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="rounded-2xl shadow-card hover:shadow-card-hover transition-shadow border border-border/60 bg-card">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-start justify-between gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
              </div>
              <div className="space-y-1 min-w-0 flex-1 text-right">
                <p className="text-3xl font-bold text-foreground leading-none">{kpi.value}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{kpi.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{kpi.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
