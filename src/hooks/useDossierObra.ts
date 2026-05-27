import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CapituloControlo {
  key: string;
  numero: number | null;
  titulo: string;
  base: number;
  adjudicado: number;
  faturado: number;
  pago: number;
  saldo: number;
  desvioPct: number;
  pctAdjudicada: number;
  pctExecutada: number;
}

export interface DossierControloSummary {
  capitulos: CapituloControlo[];
  totals: {
    base: number;
    adjudicado: number;
    faturado: number;
    pago: number;
    saldo: number;
  };
}

/**
 * Agregador para painel Controlo de Custos do Dossier do Promotor.
 * Combina:
 * - Orçamento (capítulos) → base + adjudicado
 * - Autos de medição (itens com capitulo + valor_acumulado) → faturado
 * - Contas financeiras (despesas pagas) → pago (rateado por capítulo via valor)
 */
export function useDossierObra(obraId: string | undefined) {
  return useQuery({
    queryKey: ['dossier-obra', obraId],
    enabled: !!obraId,
    queryFn: async (): Promise<DossierControloSummary> => {
      // 1. Orçamentos da obra (preferimos adjudicado)
      const { data: orcamentos } = await supabase
        .from('orcamentos')
        .select('id, status, valor_total')
        .eq('obra_id', obraId!);

      const adjudicado =
        (orcamentos || []).find((o: any) => o.status === 'adjudicado') || (orcamentos || [])[0];

      let capitulosBase: any[] = [];
      if (adjudicado?.id) {
        const { data: caps } = await supabase
          .from('capitulos_orcamento')
          .select('id, numero, titulo, valor_total')
          .eq('orcamento_id', adjudicado.id);
        capitulosBase = caps || [];
      }


      // 2. Autos de medição → valor_acumulado por capitulo
      const { data: autos } = await supabase
        .from('autos_medicao')
        .select('id, status, itens:autos_medicao_itens(capitulo, valor_acumulado)')
        .eq('obra_id', obraId!);


      const faturadoPorCap = new Map<string, number>();
      (autos || []).forEach((a: any) => {
        (a.itens || []).forEach((it: any) => {
          const k = (it.capitulo || '').trim().toLowerCase();
          if (!k) return;
          faturadoPorCap.set(k, (faturadoPorCap.get(k) || 0) + Number(it.valor_acumulado || 0));
        });
      });

      // 3. Pagamentos (contas financeiras pagas da obra)
      // Nota: hoje contas_financeiras não tem coluna `capitulo`. Mantemos o mapa vazio
      // até existir esse vínculo (fase futura via cost_center/capitulo nas contas).
      const pagoPorCap = new Map<string, number>();


      const capitulos: CapituloControlo[] = capitulosBase
        .sort((a, b) => (a.numero || 0) - (b.numero || 0))
        .map((c) => {
          const key = (c.titulo || '').trim().toLowerCase();
          const base = Number(c.valor_total || 0);
          const adj = base; // hoje base==adjudicado; reservado para fase futura (NEs)
          const fat = faturadoPorCap.get(key) || 0;
          const pago = pagoPorCap.get(key) || 0;
          const saldo = adj - fat;
          const desvioPct = adj > 0 ? ((fat - adj) / adj) * 100 : 0;
          const pctAdjudicada = base > 0 ? (adj / base) * 100 : 0;
          const pctExecutada = adj > 0 ? (fat / adj) * 100 : 0;
          return {
            key,
            numero: c.numero ?? null,
            titulo: c.titulo,
            base,
            adjudicado: adj,
            faturado: fat,
            pago,
            saldo,
            desvioPct,
            pctAdjudicada,
            pctExecutada,
          };
        });

      const totals = capitulos.reduce(
        (acc, c) => ({
          base: acc.base + c.base,
          adjudicado: acc.adjudicado + c.adjudicado,
          faturado: acc.faturado + c.faturado,
          pago: acc.pago + c.pago,
          saldo: acc.saldo + c.saldo,
        }),
        { base: 0, adjudicado: 0, faturado: 0, pago: 0, saldo: 0 },
      );

      return { capitulos, totals };
    },
  });
}
