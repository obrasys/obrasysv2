import { useMemo } from 'react';
import { useOrcamentos } from './useOrcamentos';
import { useObras } from './useObras';
import { useClientes } from './useClientes';
import { useTarefas } from './useTarefas';
import { useFinanceiro } from './useFinanceiro';
import { useAutosMedicao } from './useAutosMedicao';
import { useRDOs } from './useRDOs';
import { useEquipaMembros } from './useRecursos';
import type { Orcamento } from '@/types/orcamentos';

export function useRelatorios() {
  const { orcamentos, isLoading: loadingOrcamentos } = useOrcamentos();
  const { obras, isLoading: loadingObras } = useObras();
  const { clientes, stats: clienteStats, isLoading: loadingClientes } = useClientes();
  const { tarefas, stats: tarefaStats, isLoading: loadingTarefas } = useTarefas();
  const { contas, dashboard: financeiroDashboard, isLoading: loadingFinanceiro } = useFinanceiro();
  const { autos, isLoading: loadingAutos } = useAutosMedicao();
  const { rdos, isLoading: loadingRDOs } = useRDOs();
  const { membros, loading: loadingMembros } = useEquipaMembros();

  const isLoading = loadingOrcamentos || loadingObras || loadingClientes || loadingTarefas || loadingFinanceiro || loadingAutos || loadingRDOs || loadingMembros;

  // Orçamentos stats
  const orcamentoStats = useMemo(() => {
    const list = orcamentos || [];
    const byStatus = (s: string) => list.filter(o => o.status === s);
    const valorByStatus = (s: string) => byStatus(s).reduce((sum, o) => sum + (o.valor_total || 0), 0);

    return {
      total: list.length,
      rascunho: byStatus('rascunho').length,
      enviados: byStatus('enviado').length,
      adjudicados: byStatus('adjudicado').length,
      aprovados: byStatus('aprovado').length,
      rejeitados: byStatus('rejeitado').length,
      valorRascunho: valorByStatus('rascunho'),
      valorEnviados: valorByStatus('enviado'),
      valorAdjudicados: valorByStatus('adjudicado'),
      valorAprovados: valorByStatus('aprovado'),
      valorRejeitados: valorByStatus('rejeitado'),
      valorTotal: list.reduce((sum, o) => sum + (o.valor_total || 0), 0),
      recentes: list.slice(0, 5) as Orcamento[],
      statusData: [
        { name: 'Rascunho', value: byStatus('rascunho').length, fill: 'hsl(var(--muted-foreground))' },
        { name: 'Enviado', value: byStatus('enviado').length, fill: 'hsl(210, 80%, 55%)' },
        { name: 'Adjudicado', value: byStatus('adjudicado').length, fill: 'hsl(270, 60%, 55%)' },
        { name: 'Aprovado', value: byStatus('aprovado').length, fill: 'hsl(142, 60%, 45%)' },
        { name: 'Rejeitado', value: byStatus('rejeitado').length, fill: 'hsl(0, 70%, 55%)' },
      ].filter(d => d.value > 0),
    };
  }, [orcamentos]);

  // Obras stats
  const obraStats = useMemo(() => {
    const list = obras || [];
    const byStatus = (s: string) => list.filter(o => o.status === s);
    const ativas = list.filter(o => o.status === 'em_curso');
    const progressoMedio = ativas.length > 0
      ? ativas.reduce((sum, o) => sum + (o.progresso || 0), 0) / ativas.length
      : 0;

    return {
      total: list.length,
      emCurso: byStatus('em_curso').length,
      planeamento: byStatus('planeamento').length,
      concluidas: byStatus('concluida').length,
      pausadas: byStatus('pausada').length,
      valorTotal: list.reduce((sum, o) => sum + (o.valor_previsto || 0), 0),
      progressoMedio,
      totalRDOs: (rdos || []).length,
      totalAutos: (autos || []).length,
      statusData: [
        { name: 'Em Curso', value: byStatus('em_curso').length, fill: 'hsl(210, 80%, 55%)' },
        { name: 'Planeamento', value: byStatus('planeamento').length, fill: 'hsl(45, 80%, 55%)' },
        { name: 'Concluída', value: byStatus('concluida').length, fill: 'hsl(142, 60%, 45%)' },
        { name: 'Pausada', value: byStatus('pausada').length, fill: 'hsl(0, 70%, 55%)' },
      ].filter(d => d.value > 0),
    };
  }, [obras, rdos, autos]);

  // Margens de lucro
  const margensLucro = useMemo(() => {
    const list = orcamentos || [];
    const adjudicados = list.filter(o => o.status === 'adjudicado' || o.status === 'aprovado');
    if (adjudicados.length === 0) return { valorBase: 0, valorComMargem: 0, lucroTotal: 0, margemMedia: 0 };

    const margemMedia = adjudicados.reduce((sum, o) => sum + (o.margem_lucro || 0), 0) / adjudicados.length;
    const valorComMargem = adjudicados.reduce((sum, o) => sum + (o.valor_total || 0), 0);
    const valorBase = valorComMargem / (1 + margemMedia / 100);
    const lucroTotal = valorComMargem - valorBase;

    return { valorBase, valorComMargem, lucroTotal, margemMedia };
  }, [orcamentos]);

  // Recursos stats
  const recursosStats = useMemo(() => {
    const list = membros || [];
    const ativos = list.filter(m => m.ativo);
    const comObra = list.filter(m => m.obra_atual_id);
    const custoTotal = list.reduce((sum, m) => sum + (m.salario_base || 0), 0);

    return {
      totalMembros: list.length,
      ativos: ativos.length,
      alocados: comObra.length,
      custoTotalMensal: custoTotal,
      membrosComObra: comObra,
    };
  }, [membros]);

  // Resumo geral
  const resumo = useMemo(() => ({
    totalObras: (obras || []).length,
    totalOrcamentos: (orcamentos || []).length,
    totalClientes: clienteStats?.total || 0,
    valorTotalObras: (obras || []).reduce((sum, o) => sum + (o.valor_previsto || 0), 0),
    saldoFinanceiro: financeiroDashboard?.saldo || 0,
    totalTarefas: tarefaStats?.total || 0,
    receitas: financeiroDashboard?.totalReceber || 0,
    despesas: financeiroDashboard?.totalPagar || 0,
  }), [obras, orcamentos, clienteStats, financeiroDashboard, tarefaStats]);

  return {
    isLoading,
    resumo,
    orcamentoStats,
    obraStats,
    tarefaStats,
    clienteStats,
    financeiroDashboard,
    margensLucro,
    recursosStats,
    contas,
  };
}
