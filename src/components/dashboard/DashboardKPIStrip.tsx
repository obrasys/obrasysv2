import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from './Sparkline';

interface KPIStripProps {
  pipelineValue: number;
  rfqsCount: number;
  confiancaMedia: number;
  cicloMedio: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const sparkData = [
  [12, 15, 13, 18, 16, 19, 17, 20, 18, 22, 20, 23, 21, 24, 22, 25, 23, 26, 24, 28],
  [8, 9, 8, 10, 11, 10, 12, 13, 12, 14, 15, 14, 16, 15, 17, 16, 18, 17, 19, 20],
  [82, 83, 82, 84, 85, 84, 86, 87, 86, 88, 89, 88, 90, 89, 90, 91, 90, 91, 92, 91.4],
  [9.2, 9.0, 8.8, 8.6, 8.4, 8.2, 8.0, 7.8, 7.6, 7.4, 7.2, 7.0, 6.8, 6.6, 6.4, 6.2, 6.0, 5.8, 5.6, 6.8],
];

export function DashboardKPIStrip({ pipelineValue, rfqsCount, confiancaMedia, cicloMedio }: KPIStripProps) {
  const kpis = [
    {
      label: 'PIPELINE ATIVO',
      index: '01/04',
      value: formatCurrency(pipelineValue),
      change: '+8,4%',
      changeUp: true,
      subtitle: '5 projetos · 11 pacotes',
      spark: sparkData[0],
      sparkColor: '#3B82F6',
    },
    {
      label: 'RFQs EM CURSO',
      index: '02/04',
      value: String(rfqsCount),
      change: '+12',
      changeUp: true,
      subtitle: '18 pendentes resposta',
      spark: sparkData[1],
      sparkColor: '#8B5CF6',
    },
    {
      label: 'CONFIANÇA MÉDIA IA',
      index: '03/04',
      value: `${confiancaMedia.toFixed(1).replace('.', ',')}%`,
      change: '+1,2 p.p.',
      changeUp: true,
      subtitle: 'Nas últimas 12 extrações',
      spark: sparkData[2],
      sparkColor: '#10B981',
    },
    {
      label: 'CICLO MÉDIO ORÇAMENTO',
      index: '04/04',
      value: `${cicloMedio.toFixed(1).replace('.', ',')}d`,
      change: '-2,1d',
      changeUp: false,
      subtitle: 'Vs. trimestre anterior',
      spark: sparkData[3],
      sparkColor: '#F59E0B',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{kpi.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{kpi.index}</span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-2">
                <p className="text-2xl font-bold text-foreground leading-none tracking-tight">{kpi.value}</p>
                <div className="flex items-center gap-1.5">
                  {kpi.changeUp ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span className="text-xs font-medium text-emerald-500">{kpi.change}</span>
                </div>
              </div>
              <div className="pb-1 opacity-80">
                <Sparkline data={kpi.spark} color={kpi.sparkColor} width={80} height={32} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">{kpi.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
