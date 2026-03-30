import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, MoreHorizontal } from 'lucide-react';

interface DespesasOrigemCardProps {
  contasPorOrigem?: {
    mao_de_obra: number;
    material: number;
    outros: number;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

export function DespesasOrigemCard({ contasPorOrigem }: DespesasOrigemCardProps) {
  if (!contasPorOrigem) return null;

  const total = contasPorOrigem.mao_de_obra + contasPorOrigem.material + contasPorOrigem.outros;

  const items = [
    { label: 'Mão de Obra', value: contasPorOrigem.mao_de_obra, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Material', value: contasPorOrigem.material, icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Outros', value: contasPorOrigem.outros, icon: MoreHorizontal, color: 'text-muted-foreground', bg: 'bg-muted' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Despesas por Origem</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((item) => {
            const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
            return (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{formatCurrency(item.value)}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label} · {percent}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
