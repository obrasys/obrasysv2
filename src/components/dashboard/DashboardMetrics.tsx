import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Wallet, FileText, Camera } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { Obra } from '@/types/obras';

interface DashboardMetricsProps {
  obras: Obra[];
  rdos: any[];
  orcamentos: any[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  sparkData,
  sparkColor,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  trend: number;
  sparkData: number[];
  sparkColor: string;
}) {
  const trendPositive = trend >= 0;
  return (
    <Card className="rounded-xl shadow-card">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <span className={`text-xs font-semibold ${trendPositive ? 'text-success' : 'text-destructive'}`}>
            {trendPositive ? '+' : ''}{trend.toFixed(1)}%
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <MiniSparkline data={sparkData} color={sparkColor} />
      </CardContent>
    </Card>
  );
}

export function DashboardMetrics({ obras, rdos, orcamentos }: DashboardMetricsProps) {
  const metrics = useMemo(() => {
    const obrasAtivas = obras?.filter(o => o.status === 'em_curso').length || 0;
    const obrasPausadas = obras?.filter(o => o.status === 'pausada').length || 0;
    const alertas = obrasPausadas + (obras?.filter(o => o.progresso === 0 && o.status === 'em_curso').length || 0);

    const valorTotal = obras?.reduce((sum, o) => sum + (o.valor_previsto || 0), 0) || 0;
    const valorOrcamentos = orcamentos?.reduce((sum: number, o: any) => sum + (o.valor_total || 0), 0) || 0;
    
    const rdosComFotos = rdos?.filter((r: any) => r.fotos && r.fotos.length > 0).length || 0;

    return { alertas, valorTotal, valorOrcamentos, rdosComFotos };
  }, [obras, rdos, orcamentos]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        icon={AlertTriangle}
        iconBg="bg-warning/10"
        iconColor="text-warning"
        label="Alertas"
        value={String(metrics.alertas)}
        trend={metrics.alertas > 0 ? -5.2 : 0}
        sparkData={[3, 5, 2, 8, 4, 6, metrics.alertas]}
        sparkColor="hsl(32 95% 44%)"
      />
      <MetricCard
        icon={Wallet}
        iconBg="bg-success/10"
        iconColor="text-success"
        label="Valor Obras"
        value={formatCurrency(metrics.valorTotal)}
        trend={12.4}
        sparkData={[20, 35, 28, 45, 42, 55, 60]}
        sparkColor="hsl(146 50% 36%)"
      />
      <MetricCard
        icon={FileText}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        label="Orçamentos"
        value={formatCurrency(metrics.valorOrcamentos)}
        trend={8.1}
        sparkData={[15, 22, 18, 30, 25, 35, 40]}
        sparkColor="hsl(var(--primary))"
      />
      <MetricCard
        icon={Camera}
        iconBg="bg-secondary/10"
        iconColor="text-secondary"
        label="RDOs c/ Evidências"
        value={String(metrics.rdosComFotos)}
        trend={3.7}
        sparkData={[2, 4, 3, 6, 5, 7, metrics.rdosComFotos]}
        sparkColor="hsl(195 63% 28%)"
      />
    </div>
  );
}
