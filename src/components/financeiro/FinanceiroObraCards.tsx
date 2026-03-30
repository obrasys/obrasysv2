import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Package,
  MoreHorizontal,
  Eye,
  Loader2,
} from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

interface ObraFinanceData {
  obraId: string;
  obraNome: string;
  obraStatus: string;
  receita: number;
  despesas: number;
  maoDeObra: number;
  material: number;
  outros: number;
  lucro: number;
  margem: number;
}

export function FinanceiroObraCards() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: obrasFinance, isLoading } = useQuery({
    queryKey: ['financeiro-por-obra', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch obras
      const { data: obras, error: obrasErr } = await supabase
        .from('obras')
        .select('id, nome, status')
        .eq('arquivada', false)
        .order('created_at', { ascending: false });
      if (obrasErr) throw obrasErr;

      // Fetch all contas
      const { data: contas } = await supabase
        .from('contas_financeiras')
        .select('obra_id, tipo, origem, valor, pago');

      // Fetch budget awards for revenue
      const { data: awards } = await supabase
        .from('budget_awards')
        .select('obra_id, awarded_total_amount')
        .eq('status', 'active');

      // Fetch labor costs
      const { data: laborEntries } = await (supabase as any)
        .from('project_labor_cost_entries')
        .select('obra_id, amount')
        .neq('status', 'reversed');

      const results: ObraFinanceData[] = [];

      for (const obra of obras || []) {
        const obraContas = (contas || []).filter(c => c.obra_id === obra.id);
        const obraAwards = (awards || []).filter(a => a.obra_id === obra.id);
        const obraLabor = (laborEntries || []).filter((l: any) => l.obra_id === obra.id);

        const receita = obraAwards.reduce((s, a) => s + Number(a.awarded_total_amount), 0);
        const contasPagar = obraContas.filter(c => c.tipo === 'pagar');
        const maoDeObra = contasPagar.filter(c => c.origem === 'mao_de_obra').reduce((s, c) => s + Number(c.valor), 0)
          + obraLabor.reduce((s: number, l: any) => s + Number(l.amount || 0), 0);
        const material = contasPagar.filter(c => c.origem === 'material').reduce((s, c) => s + Number(c.valor), 0);
        const outros = contasPagar.filter(c => c.origem === 'outros').reduce((s, c) => s + Number(c.valor), 0);
        const despesas = maoDeObra + material + outros;
        const lucro = receita - despesas;
        const margem = receita > 0 ? (lucro / receita) * 100 : 0;

        // Only show obras with any financial activity
        if (receita > 0 || despesas > 0) {
          results.push({
            obraId: obra.id,
            obraNome: obra.nome,
            obraStatus: obra.status,
            receita,
            despesas,
            maoDeObra,
            material,
            outros,
            lucro,
            margem,
          });
        }
      }

      return results;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!obrasFinance || obrasFinance.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma obra com dados financeiros</p>
        </CardContent>
      </Card>
    );
  }

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    em_curso: { label: 'Em Curso', variant: 'default' },
    planeamento: { label: 'Planeamento', variant: 'secondary' },
    concluida: { label: 'Concluída', variant: 'outline' },
    suspensa: { label: 'Suspensa', variant: 'destructive' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Financeiro por Obra</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {obrasFinance.map((obra) => {
          const margemColor = obra.margem >= 15 ? 'text-emerald-600' : obra.margem >= 5 ? 'text-amber-600' : 'text-destructive';
          const margemBg = obra.margem >= 15 ? 'bg-emerald-500' : obra.margem >= 5 ? 'bg-amber-500' : 'bg-destructive';
          const status = statusMap[obra.obraStatus] || { label: obra.obraStatus, variant: 'outline' as const };

          return (
            <Card key={obra.obraId} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-semibold truncate">{obra.obraNome}</CardTitle>
                    <Badge variant={status.variant} className="mt-1 text-[10px]">{status.label}</Badge>
                  </div>
                  <div className={`text-right shrink-0`}>
                    <p className={`text-lg font-bold ${margemColor}`}>{obra.margem.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground">Margem</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 flex-1 flex flex-col gap-3">
                {/* Lucro/Prejuízo */}
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Balanço</span>
                    <span className={`text-sm font-bold ${obra.lucro >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {formatCurrency(obra.lucro)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress value={Math.max(0, Math.min(100, obra.margem))} className="h-1.5" />
                  </div>
                </div>

                {/* Receita e Despesas */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-700 truncate">{formatCurrency(obra.receita)}</p>
                      <p className="text-[10px] text-emerald-600/70">Receita</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                    <ArrowDownRight className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-destructive truncate">{formatCurrency(obra.despesas)}</p>
                      <p className="text-[10px] text-destructive/70">Despesas</p>
                    </div>
                  </div>
                </div>

                {/* Breakdown despesas */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground px-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {formatCurrency(obra.maoDeObra)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" /> {formatCurrency(obra.material)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MoreHorizontal className="w-3 h-3" /> {formatCurrency(obra.outros)}
                  </span>
                </div>

                {/* Action */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-auto text-xs"
                  onClick={() => navigate(`/obras/${obra.obraId}/financeiro`)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
