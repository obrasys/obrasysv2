import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Package,
  MoreHorizontal,
  Receipt,
  UtensilsCrossed,
  Fuel,
  Car,
  ParkingCircle,
  Wrench,
  MapPin,
  Loader2,
} from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const EXTRA_TAGS: Record<string, { label: string; icon: typeof Receipt }> = {
  'ALMOÇO': { label: 'Almoços', icon: UtensilsCrossed },
  'GASÓLEO': { label: 'Gasóleo', icon: Fuel },
  'PORTAGEM': { label: 'Portagens', icon: Car },
  'ESTACIONAMENTO': { label: 'Estacion.', icon: ParkingCircle },
  'FERRAMENTA': { label: 'Ferramentas', icon: Wrench },
  'DESLOCAÇÃO': { label: 'Deslocações', icon: MapPin },
};

function extractTag(desc: string | null): string | null {
  if (!desc) return null;
  const match = desc.match(/^\[([A-ZÁÉÍÓÚÃÕÇ]+)\]/);
  return match ? match[1] : null;
}

interface DespesasOrigemCardProps {
  contasPorOrigem?: {
    mao_de_obra: number;
    material: number;
    outros: number;
  };
}

export function DespesasOrigemCard({ contasPorOrigem }: DespesasOrigemCardProps) {
  const { user } = useAuth();

  // Fetch extras breakdown globally
  const { data: extrasBreakdown, isLoading } = useQuery({
    queryKey: ['extras-breakdown-global', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contas_financeiras')
        .select('descricao, valor')
        .eq('tipo', 'pagar')
        .eq('origem', 'outros');

      const breakdown: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        const tag = extractTag(c.descricao) || 'OUTROS';
        breakdown[tag] = (breakdown[tag] || 0) + Number(c.valor);
      });
      return breakdown;
    },
    enabled: !!user?.id,
  });

  if (!contasPorOrigem) return null;

  const total = contasPorOrigem.mao_de_obra + contasPorOrigem.material + contasPorOrigem.outros;

  const items = [
    { label: 'Mão de Obra', value: contasPorOrigem.mao_de_obra, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Material', value: contasPorOrigem.material, icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Despesas Extras', value: contasPorOrigem.outros, icon: Receipt, color: 'text-muted-foreground', bg: 'bg-muted' },
  ];

  const extrasEntries = Object.entries(extrasBreakdown || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Despesas por Origem</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* Extras breakdown */}
        {extrasEntries.length > 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/20 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              Detalhe Despesas Extras
            </p>
            <div className="flex flex-wrap gap-2">
              {extrasEntries.map(([tag, val]) => {
                const config = EXTRA_TAGS[tag];
                const Icon = config?.icon || MoreHorizontal;
                const percent = contasPorOrigem.outros > 0 ? ((val / contasPorOrigem.outros) * 100).toFixed(0) : '0';
                return (
                  <Badge key={tag} variant="secondary" className="gap-1.5 text-xs py-1 px-2.5 font-normal">
                    <Icon className="w-3 h-3" />
                    {config?.label || tag}: {formatCurrency(val)}
                    <span className="text-muted-foreground ml-0.5">({percent}%)</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
