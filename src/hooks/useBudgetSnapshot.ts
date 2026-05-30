import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { OrcamentoRaiConsolidation, FinancialPhase } from '@/types/orcamento-rai';
import type { FinancialWorkCycle } from '@/types/financial-cycles';

const sb = supabase as any;

const PHASE_LABEL: Record<FinancialPhase, string> = {
  budget: 'Budget',
  forecast: 'Forecast',
  outturn: 'Outturn',
  aftercare: 'Aftercare',
};

/**
 * Fase 3-6 — Snapshot & Lock genérico por fase.
 * Cria (ou atualiza) o ciclo financeiro da fase indicada, regista source_links
 * (anti-duplicação) e bloqueia o ciclo no momento da captura.
 */
export function useSnapshotAndLockPhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      obra_id: string;
      organization_id: string;
      phase: FinancialPhase;
      consolidation: OrcamentoRaiConsolidation;
      notes?: string;
    }) => {
      const { obra_id, organization_id, phase, consolidation, notes } = input;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Não autenticado');

      const phaseData = consolidation.phases.find((p) => p.phase === phase);
      if (!phaseData) throw new Error(`Fase ${phase} não encontrada na consolidação`);

      // Versão seguinte
      const { data: existing } = await sb
        .from('financial_work_cycles')
        .select('id,version,status')
        .eq('obra_id', obra_id)
        .eq('phase', phase)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion =
        existing?.status === 'locked' ? existing.version + 1 : existing?.version ?? 1;

      const cycleRow = {
        obra_id,
        organization_id,
        user_id: auth.user.id,
        phase,
        status: 'locked',
        version: nextVersion,
        total_vendas: phaseData.vendas,
        total_custos: phaseData.custos,
        margem_valor: phaseData.margin,
        margem_pct: phaseData.marginPct,
        rai: phaseData.rai,
        desvio_budget: consolidation.kpis.desvioBudget,
        impacto_mce: consolidation.kpis.impactoMce,
        custos_spv: consolidation.kpis.custosSpv,
        snapshot: {
          captured_at: new Date().toISOString(),
          consolidation,
        },
        notes: notes ?? null,
        locked_at: new Date().toISOString(),
        locked_by: auth.user.id,
      };

      const { data: cycle, error: cErr } = await sb
        .from('financial_work_cycles')
        .upsert(cycleRow, { onConflict: 'obra_id,phase,version' })
        .select()
        .single();
      if (cErr) throw cErr;

      // Source links por fase
      const links: Array<{ source_module: string; source_id: string; source_label: string; amount: number }> = [];

      consolidation.sources.forEach((src) => {
        if (src.key === 'orcamento-base' && src.totalDocs > 0) {
          links.push({
            source_module: 'orcamento',
            source_id: `obra:${obra_id}:orcamentos`,
            source_label: `${src.acceptedDocs} adjudicado(s) de ${src.totalDocs}`,
            amount: src.amount,
          });
        }
        if (src.key === 'mce' && src.totalDocs > 0) {
          links.push({
            source_module: 'mce',
            source_id: `obra:${obra_id}:mces`,
            source_label: `${src.totalDocs} MCE(s)`,
            amount: src.amount,
          });
        }
        if (src.key === 'compras' && src.totalDocs > 0) {
          links.push({
            source_module: 'purchase',
            source_id: `obra:${obra_id}:compras`,
            source_label: `${src.totalDocs} compra(s)`,
            amount: src.amount,
          });
        }
        if (src.key === 'autos' && src.totalDocs > 0) {
          links.push({
            source_module: 'auto_medicao',
            source_id: `obra:${obra_id}:autos`,
            source_label: `${src.acceptedDocs} aprovado(s)`,
            amount: src.amount,
          });
        }
        if (src.key === 'faturacao' && src.totalDocs > 0) {
          links.push({
            source_module: 'conta_financeira',
            source_id: `obra:${obra_id}:faturacao`,
            source_label: `${src.totalDocs} movimento(s)`,
            amount: src.amount,
          });
        }
      });

      if (phase === 'budget') {
        links.push({
          source_module: 'closing_sheet',
          source_id: `obra:${obra_id}:ff_base`,
          source_label: 'Folha de Fecho Base',
          amount: phaseData.vendas,
        });
      }
      if (phase === 'outturn') {
        links.push({
          source_module: 'closing_sheet',
          source_id: `obra:${obra_id}:ff_final`,
          source_label: 'Folha de Fecho Final',
          amount: phaseData.vendas,
        });
      }

      if (links.length > 0) {
        const rows = links.map((l) => ({
          organization_id,
          obra_id,
          cycle_id: cycle.id,
          phase,
          source_module: l.source_module,
          source_id: l.source_id,
          source_label: l.source_label,
          amount: l.amount,
          weight: 1,
          consolidated_at: new Date().toISOString(),
        }));
        const { error: lErr } = await sb
          .from('financial_source_links')
          .upsert(rows, { onConflict: 'obra_id,phase,source_module,source_id' });
        if (lErr) throw lErr;
      }

      return cycle as FinancialWorkCycle;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['financial-cycles', vars.obra_id] });
      qc.invalidateQueries({ queryKey: ['orcamento-rai-obra', vars.obra_id] });
      toast({
        title: `${PHASE_LABEL[vars.phase]} bloqueado`,
        description: 'Snapshot oficial criado.',
      });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao bloquear', description: e.message, variant: 'destructive' }),
  });
}

// Mantém a API antiga para retrocompatibilidade
export function useSnapshotAndLockBudget() {
  const generic = useSnapshotAndLockPhase();
  return {
    ...generic,
    mutate: (input: {
      obra_id: string;
      organization_id: string;
      consolidation: OrcamentoRaiConsolidation;
      notes?: string;
    }) => generic.mutate({ ...input, phase: 'budget' }),
  };
}
