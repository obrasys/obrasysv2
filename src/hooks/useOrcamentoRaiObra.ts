import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  FinancialPhase,
  OrcamentoRaiConsolidation,
  PhaseStatus,
  AttentionItem,
  IntegrationSourceCard,
} from '@/types/orcamento-rai';

// Phase 1: consolidação read-only a partir das fontes já existentes.
// Não escreve em nenhuma tabela. Não bloqueia se algum módulo não tiver dados.

function safeNum(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function detectPhase(obraStatus: string, ffBaseApproved: boolean, ffFinalApproved: boolean): FinancialPhase {
  if (ffFinalApproved && (obraStatus === 'concluida' || obraStatus === 'pos_venda')) return 'aftercare';
  if (ffFinalApproved) return 'outturn';
  if (ffBaseApproved && (obraStatus === 'em_curso' || obraStatus === 'pausada')) return 'forecast';
  if (obraStatus === 'concluida') return 'outturn';
  return 'budget';
}

export function useOrcamentoRaiObra(obraId: string | undefined) {
  return useQuery({
    queryKey: ['orcamento-rai-obra', obraId],
    enabled: !!obraId,
    staleTime: 30_000,
    queryFn: async (): Promise<OrcamentoRaiConsolidation> => {
      if (!obraId) throw new Error('obraId obrigatório');

      // Lê em paralelo todas as fontes (tolerante a ausência de dados/tabela).
      const sb = supabase as any;
      const safeList = async (q: any): Promise<any[]> => {
        try {
          const r = await q;
          return Array.isArray(r?.data) ? r.data : [];
        } catch {
          return [];
        }
      };

      const orcsPreload = await safeList(sb.from('orcamentos').select('id,titulo,status,valor_total,updated_at').eq('obra_id', obraId));
      const budgetIds = orcsPreload.map((o: any) => o.id).filter(Boolean);

      const ffSelect = 'id,closing_type,status,obra_id,source_budget_id,sale_price,total_direct_cost,total_indirect_cost,site_costs,structure_costs,margin_amount,expected_result,final_result,approved_at,locked_at,updated_at';
      const ffByObra = safeList(sb.from('closing_sheets').select(ffSelect).eq('obra_id', obraId));
      const ffByBudget = budgetIds.length > 0
        ? safeList(sb.from('closing_sheets').select(ffSelect).in('source_budget_id', budgetIds))
        : Promise.resolve([] as any[]);

      const [obraR, ffByObraData, ffByBudgetData, mceData, comprasData, autosData, contasData, aftercareData, retentionsData] = await Promise.all([
        sb.from('obras').select('id,nome,status,cost_center_id,updated_at').eq('id', obraId).maybeSingle(),
        ffByObra,
        ffByBudget,
        safeList(sb.from('mce_records').select('id,status,updated_at').eq('obra_id', obraId)),
        safeList(sb.from('contracting_packages').select('id,status,total_amount,mce_id,updated_at').eq('obra_id', obraId)),
        safeList(sb.from('autos_medicao').select('id,status,valor_total,updated_at').eq('obra_id', obraId)),
        safeList(sb.from('contas_financeiras').select('id,tipo,valor,status,updated_at').eq('obra_id', obraId)),
        safeList(sb.from('aftercare_records').select('id,status,cost_value,reported_at,updated_at').eq('obra_id', obraId)),
        safeList(sb.from('guarantee_retentions').select('id,status,retained_amount,released_amount,due_date,updated_at').eq('obra_id', obraId)),
      ]);

      if (obraR.error) throw obraR.error;
      const obra = obraR.data;
      if (!obra) throw new Error('Obra não encontrada');

      // Dedupe FF by id, merging hits from obra_id and source_budget_id queries
      const ffMap = new Map<string, any>();
      for (const s of [...ffByObraData, ...ffByBudgetData]) {
        if (s?.id && !ffMap.has(s.id)) ffMap.set(s.id, s);
      }
      const ffData = Array.from(ffMap.values());
      const orcsData = orcsPreload;

      const ffBase = ffData.find((s: any) => s.closing_type === 'initial');
      const ffFinal = ffData.find((s: any) => s.closing_type === 'final');
      const ffBaseApproved = !!ffBase?.approved_at || ffBase?.status === 'approved' || ffBase?.status === 'locked';
      const ffFinalApproved = !!ffFinal?.approved_at || ffFinal?.status === 'approved' || ffFinal?.status === 'locked';

      const currentPhase = detectPhase(obra.status, ffBaseApproved, ffFinalApproved);

      // KPIs base (a partir da FF Base como referência de Budget)
      const budgetVendas = safeNum(ffBase?.sale_price);
      const budgetCustos = safeNum(ffBase?.total_direct_cost) + safeNum(ffBase?.total_indirect_cost) + safeNum(ffBase?.site_costs) + safeNum(ffBase?.structure_costs);
      const budgetMargem = budgetVendas - budgetCustos;
      const budgetMargemPct = budgetVendas > 0 ? (budgetMargem / budgetVendas) * 100 : 0;
      const budgetRai = safeNum(ffBase?.expected_result ?? budgetMargem);

      // Forecast: orçamentos adjudicados + autos como proxy simples
      const adjudicados = orcsData.filter((o: any) => ['adjudicado', 'aprovado'].includes(o.status));
      const forecastVendas = adjudicados.reduce((s: number, o: any) => s + safeNum(o.valor_total), 0) || budgetVendas;
      const comprasTotal = comprasData.reduce((s: number, c: any) => s + safeNum(c.total_amount), 0);
      const forecastCustos = comprasTotal || budgetCustos;
      const forecastMargem = forecastVendas - forecastCustos;
      const forecastMargemPct = forecastVendas > 0 ? (forecastMargem / forecastVendas) * 100 : 0;

      // Outturn (real): final_result quando existir
      const outturnRai = safeNum(ffFinal?.final_result ?? ffFinal?.expected_result);
      const outturnVendas = safeNum(ffFinal?.sale_price);
      const outturnCustos = safeNum(ffFinal?.total_direct_cost) + safeNum(ffFinal?.total_indirect_cost);

      // SPV / Aftercare — soma de custos abertos + resolvidos
      const custosSpv = aftercareData.reduce((s: number, a: any) => s + safeNum(a.cost_value), 0);
      const aftercareAbertos = aftercareData.filter((a: any) => a.status === 'aberto' || a.status === 'em_analise').length;
      const retencoesAtivas = retentionsData.filter((r: any) => r.status === 'retida' || r.status === 'liberada_parcial');
      const retencoesValor = retencoesAtivas.reduce((s: number, r: any) => s + (safeNum(r.retained_amount) - safeNum(r.released_amount)), 0);

      const phases = [
        {
          phase: 'budget' as FinancialPhase,
          label: 'Budget',
          status: (ffBaseApproved ? 'locked' : 'active') as PhaseStatus,
          date: ffBase?.approved_at || ffBase?.updated_at || null,
          rai: budgetRai,
          margin: budgetMargem,
          marginPct: budgetMargemPct,
          vendas: budgetVendas,
          custos: budgetCustos,
          note: ffBaseApproved ? 'Folha de Fecho Base aprovada' : 'Aguarda aprovação da FF Base',
        },
        {
          phase: 'forecast' as FinancialPhase,
          label: 'Forecast',
          status: (ffBaseApproved ? (ffFinalApproved ? 'done' : 'active') : 'pending') as PhaseStatus,
          date: null,
          rai: forecastMargem,
          margin: forecastMargem,
          marginPct: forecastMargemPct,
          vendas: forecastVendas,
          custos: forecastCustos,
          note: ffBaseApproved ? 'Em produção' : 'Disponível após FF Base aprovada',
        },
        {
          phase: 'outturn' as FinancialPhase,
          label: 'Outturn',
          status: (ffFinalApproved ? 'locked' : obra.status === 'concluida' ? 'active' : 'future') as PhaseStatus,
          date: ffFinal?.approved_at || null,
          rai: outturnRai,
          margin: outturnVendas - outturnCustos,
          marginPct: outturnVendas > 0 ? ((outturnVendas - outturnCustos) / outturnVendas) * 100 : 0,
          vendas: outturnVendas,
          custos: outturnCustos,
          note: ffFinalApproved ? 'Folha de Fecho Final aprovada' : 'Disponível no fecho da obra',
        },
        {
          phase: 'aftercare' as FinancialPhase,
          label: 'Aftercare',
          status: (currentPhase === 'aftercare' ? 'active' : 'future') as PhaseStatus,
          date: null,
          rai: outturnRai - custosSpv,
          margin: 0,
          marginPct: 0,
          vendas: 0,
          custos: custosSpv,
          note: 'Disponível no início do pós-venda',
        },
      ];

      const current = phases.find(p => p.phase === currentPhase)!;

      // Alertas básicos
      const attention: AttentionItem[] = [];
      if (!ffBaseApproved) {
        attention.push({
          id: 'ff-base',
          severity: 'warning',
          title: 'Folha de Fecho Base ainda não aprovada',
          description: 'O Budget só passa a referência oficial após a aprovação da FF Base.',
          source: 'Folha de Fecho',
        });
      }
      const comprasSemMce = comprasData.filter((c: any) => !c.mce_id).length;
      if (comprasSemMce > 0) {
        attention.push({
          id: 'compras-sem-mce',
          severity: 'high',
          title: `${comprasSemMce} compra(s) sem MCE associado`,
          description: 'Todas as compras devem estar ligadas a um MCE para alimentar o Forecast.',
          source: 'Compras',
        });
      }
      const autosPendentes = autosData.filter((a: any) => a.status === 'submetido' || a.status === 'em_revisao').length;
      if (autosPendentes > 0) {
        attention.push({
          id: 'autos-pendentes',
          severity: 'warning',
          title: `${autosPendentes} auto(s) pendente(s) de aprovação`,
          description: 'Autos pendentes não entram como produção confirmada.',
          source: 'Autos & Medições',
        });
      }

      if (aftercareAbertos > 0) {
        attention.push({
          id: 'aftercare-abertos',
          severity: 'warning',
          title: `${aftercareAbertos} reclamação(ões) de pós-venda em aberto`,
          description: 'Acompanhe a resolução para fechar o RAI com SPV.',
          source: 'Pós-venda',
        });
      }
      const hoje = new Date();
      const retencoesVencidas = retencoesAtivas.filter((r: any) => r.due_date && new Date(r.due_date) < hoje).length;
      if (retencoesVencidas > 0) {
        attention.push({
          id: 'retencoes-vencidas',
          severity: 'high',
          title: `${retencoesVencidas} retenção(ões) vencida(s)`,
          description: 'Existem retenções com data de libertação ultrapassada.',
          source: 'Retenções',
        });
      }

      const sources: IntegrationSourceCard[] = [
        {
          key: 'orcamento-base',
          label: 'Orçamento Base',
          module: 'Orçamentos',
          state: orcsData.length > 0 ? 'consolidated' : 'no_data',
          lastUpdate: orcsData[0]?.updated_at || null,
          totalDocs: orcsData.length,
          acceptedDocs: adjudicados.length,
          pendingDocs: orcsData.length - adjudicados.length,
          conflicts: 0,
          amount: budgetVendas,
        },
        {
          key: 'mce',
          label: 'MCEs / Adjudicações',
          module: 'MCE',
          state: mceData.length > 0 ? 'found' : 'no_data',
          lastUpdate: mceData[0]?.updated_at || null,
          totalDocs: mceData.length,
          acceptedDocs: mceData.filter((m: any) => m.status === 'adjudicado').length,
          pendingDocs: mceData.filter((m: any) => m.status !== 'adjudicado').length,
          conflicts: 0,
          amount: 0,
        },
        {
          key: 'compras',
          label: 'Compras / Contratos',
          module: 'Compras',
          state: comprasData.length > 0 ? 'found' : 'no_data',
          lastUpdate: comprasData[0]?.updated_at || null,
          totalDocs: comprasData.length,
          acceptedDocs: 0,
          pendingDocs: 0,
          conflicts: comprasSemMce,
          amount: comprasTotal,
        },
        {
          key: 'autos',
          label: 'Autos & Medições',
          module: 'Autos',
          state: autosData.length > 0 ? 'found' : 'no_data',
          lastUpdate: autosData[0]?.updated_at || null,
          totalDocs: autosData.length,
          acceptedDocs: autosData.filter((a: any) => a.status === 'aprovado').length,
          pendingDocs: autosPendentes,
          conflicts: 0,
          amount: autosData.reduce((s: number, a: any) => s + safeNum(a.valor_total), 0),
        },
        {
          key: 'faturacao',
          label: 'Faturação',
          module: 'Financeiro',
          state: contasData.length > 0 ? 'found' : 'no_data',
          lastUpdate: contasData[0]?.updated_at || null,
          totalDocs: contasData.length,
          acceptedDocs: 0,
          pendingDocs: 0,
          conflicts: 0,
          amount: contasData.reduce((s: number, c: any) => s + safeNum(c.valor), 0),
        },
        {
          key: 'contabilidade',
          label: 'Contabilidade',
          module: 'Contabilidade',
          state: 'no_data',
          lastUpdate: null,
          totalDocs: 0,
          acceptedDocs: 0,
          pendingDocs: 0,
          conflicts: 0,
          amount: 0,
        },
        {
          key: 'spv',
          label: 'SPV / Aftercare',
          module: 'Pós-venda',
          state: aftercareData.length > 0 ? 'consolidated' : 'no_data',
          lastUpdate: aftercareData[0]?.updated_at || null,
          totalDocs: aftercareData.length,
          acceptedDocs: aftercareData.filter((a: any) => a.status === 'resolvido').length,
          pendingDocs: aftercareAbertos,
          conflicts: 0,
          amount: custosSpv,
        },
        {
          key: 'retencoes',
          label: 'Retenções de garantia',
          module: 'Retenções',
          state: retencoesAtivas.length > 0 ? 'found' : 'no_data',
          lastUpdate: retentionsData[0]?.updated_at || null,
          totalDocs: retentionsData.length,
          acceptedDocs: retentionsData.filter((r: any) => r.status === 'liberada_total').length,
          pendingDocs: retencoesAtivas.length,
          conflicts: retencoesVencidas,
          amount: retencoesValor,
        },
        {
          key: 'axia',
          label: 'Axia',
          module: 'IA',
          state: 'consolidated',
          lastUpdate: new Date().toISOString(),
          totalDocs: 0,
          acceptedDocs: 0,
          pendingDocs: 0,
          conflicts: 0,
          amount: 0,
        },
      ];

      // Impacto MCE = compras totais - vendas adjudicadas (proxy)
      const impactoMce = comprasTotal > 0 && forecastVendas > 0 ? forecastVendas - comprasTotal : 0;

      return {
        obraId,
        obraNome: obra.nome as string,
        currentPhase,
        phases,
        kpis: {
          vendas: current.vendas,
          custos: current.custos,
          margemValor: current.margin,
          margemPct: current.marginPct,
          rai: current.rai,
          desvioBudget: current.rai - budgetRai,
          impactoMce,
          custosSpv,
          raiComSpv: outturnRai - custosSpv,
        },
        attention,
        sources,
        lastUpdate: new Date().toISOString(),
      };
    },
  });
}
