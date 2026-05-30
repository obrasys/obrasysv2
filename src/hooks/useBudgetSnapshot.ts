import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { OrcamentoRaiConsolidation } from '@/types/orcamento-rai';
import type { FinancialWorkCycle } from '@/types/financial-cycles';

const sb = supabase as any;

/**
 * Fase 3 — Snapshot & Lock do Budget.
 * Cria (ou atualiza) o ciclo financeiro da fase 'budget' a partir da consolidação read-only,
 * regista os source_links (anti-duplicação) e bloqueia o ciclo.
 */
export function useSnapshotAndLockBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      obra_id: string;
      organization_id: string;
      consolidation: OrcamentoRaiConsolidation;
      notes?: string;
    }) => {
      const { obra_id, organization_id, consolidation, notes } = input;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Não autenticado');

      const budget = consolidation.phases.find((p) => p.phase === 'budget');
      if (!budget) throw new Error('Fase Budget não encontrada');

      // Próxima versão (se já houver ciclos locked, incrementa)
      const { data: existing } = await sb
        .from('financial_work_cycles')
        .select('id,version,status')
        .eq('obra_id', obra_id)
        .eq('phase', 'budget')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = existing?.status === 'locked' ? (existing.version + 1) : (existing?.version ?? 1);

      const snapshotPayload = {
        captured_at: new Date().toISOString(),
        consolidation,
      };

      // 1) Upsert do ciclo
      const cycleRow = {
        obra_id,
        organization_id,
        user_id: auth.user.id,
        phase: 'budget',
        status: 'locked',
        version: nextVersion,
        total_vendas: budget.vendas,
        total_custos: budget.custos,
        margem_valor: budget.margin,
        margem_pct: budget.marginPct,
        rai: budget.rai,
        desvio_budget: 0,
        impacto_mce: 0,
        custos_spv: 0,
        snapshot: snapshotPayload,
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

      // 2) Source links — orçamentos adjudicados, FF Base, MCEs como referência do Budget
      const links: Array<{
        source_module: string;
        source_id: string;
        source_label: string | null;
        amount: number;
      }> = [];

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
      });

      // FF Base como referência fundamental
      links.push({
        source_module: 'closing_sheet',
        source_id: `obra:${obra_id}:ff_base`,
        source_label: 'Folha de Fecho Base',
        amount: budget.vendas,
      });

      if (links.length > 0) {
        const rows = links.map((l) => ({
          organization_id,
          obra_id,
          cycle_id: cycle.id,
          phase: 'budget',
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
      toast({ title: 'Budget bloqueado', description: 'Snapshot oficial criado para esta obra.' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao bloquear Budget', description: e.message, variant: 'destructive' }),
  });
}
