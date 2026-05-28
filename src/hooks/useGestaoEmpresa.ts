import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calcMB, calcRAI } from '@/lib/finance';

export interface ObraResult {
  obra_id: string;
  nome: string;
  status: string;
  receitas: number;
  receitas_realizadas: number;
  custos: number;
  custos_realizados: number;
  mb: number;
  mbPct: number;
  mb_realizada: number;
}

export interface GestaoEmpresaData {
  year: number;
  obras: ObraResult[];
  totalReceitas: number;
  totalCustosObra: number;
  somaMB: number;
  somaMBRealizada: number;
  custosEstrutura: number;
  custosEstruturaRealizada: number;
  rai: number;
  raiRealizado: number;
  ceBreakdown: { cost_center_id: string; code: string; name: string; total: number; pago: number }[];
}

export function useGestaoEmpresa(year: number = new Date().getFullYear()) {
  return useQuery<GestaoEmpresaData>({
    queryKey: ['gestao-empresa', year],
    queryFn: async () => {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;

      const [obrasRes, contasRes, ccRes] = await Promise.all([
        supabase.from('obras').select('id, nome, status, arquivada').eq('arquivada', false),
        supabase
          .from('contas_financeiras')
          .select('id, tipo, valor, pago, obra_id, cost_center_id, data_vencimento')
          .gte('data_vencimento', start)
          .lte('data_vencimento', end),
        supabase.from('cost_centers').select('id, code, name, type, obra_id'),
      ]);

      if (obrasRes.error) throw obrasRes.error;
      if (contasRes.error) throw contasRes.error;
      if (ccRes.error) throw ccRes.error;

      const obras = obrasRes.data ?? [];
      const contas = contasRes.data ?? [];
      const ccs = ccRes.data ?? [];

      const ccById = new Map(ccs.map((c) => [c.id, c]));
      const estruturaIds = new Set(ccs.filter((c) => c.type === 'estrutura').map((c) => c.id));

      // Per-obra aggregation
      const obraResults: ObraResult[] = obras.map((o: any) => {
        const linhas = contas.filter((c) => c.obra_id === o.id);
        const receitas = linhas
          .filter((c) => c.tipo === 'receber')
          .reduce((s, c) => s + Number(c.valor || 0), 0);
        const receitas_realizadas = linhas
          .filter((c) => c.tipo === 'receber' && c.pago)
          .reduce((s, c) => s + Number(c.valor || 0), 0);
        const custos = linhas
          .filter((c) => c.tipo === 'pagar')
          .reduce((s, c) => s + Number(c.valor || 0), 0);
        const custos_realizados = linhas
          .filter((c) => c.tipo === 'pagar' && c.pago)
          .reduce((s, c) => s + Number(c.valor || 0), 0);
        const { mb, mbPct } = calcMB(receitas, custos);
        const mb_realizada = receitas_realizadas - custos_realizados;
        return {
          obra_id: o.id,
          nome: o.nome,
          status: o.status,
          receitas,
          receitas_realizadas,
          custos,
          custos_realizados,
          mb,
          mbPct,
          mb_realizada: Math.round(mb_realizada * 100) / 100,
        };
      });

      const totalReceitas = obraResults.reduce((s, o) => s + o.receitas, 0);
      const totalCustosObra = obraResults.reduce((s, o) => s + o.custos, 0);
      const somaMB = obraResults.reduce((s, o) => s + o.mb, 0);
      const somaMBRealizada = obraResults.reduce((s, o) => s + o.mb_realizada, 0);

      // CE (estrutura) breakdown - contas a pagar com cost_center_id em estrutura
      const ceMap = new Map<string, { total: number; pago: number }>();
      for (const c of contas) {
        if (c.tipo !== 'pagar' || !c.cost_center_id) continue;
        if (!estruturaIds.has(c.cost_center_id)) continue;
        const cur = ceMap.get(c.cost_center_id) ?? { total: 0, pago: 0 };
        cur.total += Number(c.valor || 0);
        if (c.pago) cur.pago += Number(c.valor || 0);
        ceMap.set(c.cost_center_id, cur);
      }
      const ceBreakdown = Array.from(ceMap.entries()).map(([id, v]) => {
        const cc = ccById.get(id);
        return {
          cost_center_id: id,
          code: cc?.code ?? '-',
          name: cc?.name ?? '-',
          total: Math.round(v.total * 100) / 100,
          pago: Math.round(v.pago * 100) / 100,
        };
      });
      const custosEstrutura = ceBreakdown.reduce((s, c) => s + c.total, 0);
      const custosEstruturaRealizada = ceBreakdown.reduce((s, c) => s + c.pago, 0);

      const rai = calcRAI(somaMB, custosEstrutura);
      const raiRealizado = calcRAI(somaMBRealizada, custosEstruturaRealizada);

      return {
        year,
        obras: obraResults.sort((a, b) => b.mb - a.mb),
        totalReceitas,
        totalCustosObra,
        somaMB,
        somaMBRealizada,
        custosEstrutura,
        custosEstruturaRealizada,
        rai,
        raiRealizado,
        ceBreakdown: ceBreakdown.sort((a, b) => b.total - a.total),
      };
    },
  });
}
