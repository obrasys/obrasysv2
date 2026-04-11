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
      bg: 'bg-[hsl(192,55%,22%)]',
      emptyPositive: false,
    },
    {
      label: 'Obras em Risco',
      value: String(obrasEmRisco).padStart(2, '0'),
      subtitle: obrasEmRisco > 0 ? 'atenção imediata' : 'Tudo em ordem! Sem riscos detetados.',
      icon: AlertTriangle,
      bg: obrasEmRisco > 0 ? 'bg-[hsl(20,88%,40%)]' : 'bg-[hsl(146,50%,40%)]',
      emptyPositive: obrasEmRisco === 0,
    },
    {
      label: 'Cobros Previstos',
      value: formatCurrency(receberSemana),
      subtitle: receberSemana === 0 ? 'Sem cobros esta semana.' : 'a cobrar',
      icon: Wallet,
      bg: 'bg-[hsl(38,85%,50%)]',
      emptyPositive: false,
    },
    {
      label: 'Certificações',
      value: String(medicoesPendentes).padStart(2, '0'),
      subtitle: medicoesPendentes === 0 ? 'Al dia. Criar nova medição?' : 'aguardando validação',
      icon: ClipboardCheck,
      bg: 'bg-[hsl(195,55%,30%)]',
      emptyPositive: medicoesPendentes === 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className={`rounded-2xl shadow-card hover:shadow-card-hover transition-shadow border-0 ${kpi.bg}`}>
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 min-w-0 flex-1">
                <p className="text-3xl font-bold text-white">{kpi.value}</p>
                <p className="text-sm font-medium text-white/90">{kpi.label}</p>
                <p className="text-xs text-white/60 leading-relaxed">{kpi.subtitle}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/15">
                <kpi.icon className="w-5 h-5 text-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
