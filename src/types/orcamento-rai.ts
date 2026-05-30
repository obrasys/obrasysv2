// Tipos para a área "Orçamento & RAI da Obra" (dentro do módulo Orçamentos).
// Fase 1: estrutura leve, sem novas tabelas. Apenas consolidação read-only.

export type FinancialPhase = 'budget' | 'forecast' | 'outturn' | 'aftercare';

export type PhaseStatus = 'future' | 'pending' | 'active' | 'locked' | 'done';

export interface PhaseSummary {
  phase: FinancialPhase;
  label: string;
  status: PhaseStatus;
  date: string | null;
  rai: number;
  margin: number;
  marginPct: number;
  vendas: number;
  custos: number;
  note?: string;
}

export interface IntegrationSourceCard {
  key: string;
  label: string;
  module: string;
  state: 'no_data' | 'found' | 'pending_review' | 'with_conflicts' | 'consolidated' | 'sync_error';
  lastUpdate: string | null;
  totalDocs: number;
  acceptedDocs: number;
  pendingDocs: number;
  conflicts: number;
  amount: number;
  raiImpact?: number;
}

export interface AttentionItem {
  id: string;
  severity: 'info' | 'warning' | 'high';
  title: string;
  description: string;
  source: string;
}

export interface OrcamentoRaiConsolidation {
  obraId: string;
  obraNome: string;
  currentPhase: FinancialPhase;
  phases: PhaseSummary[];
  kpis: {
    vendas: number;
    custos: number;
    margemValor: number;
    margemPct: number;
    rai: number;
    desvioBudget: number;
    impactoMce: number;
    custosSpv: number;
    raiComSpv: number;
  };
  attention: AttentionItem[];
  sources: IntegrationSourceCard[];
  lastUpdate: string;
}

export const PHASE_LABELS: Record<FinancialPhase, string> = {
  budget: 'Budget',
  forecast: 'Forecast',
  outturn: 'Outturn',
  aftercare: 'Aftercare',
};

export const PHASE_DESCRIPTIONS: Record<FinancialPhase, string> = {
  budget: 'Fase pré-obra. Orçamento Base, Estaleiro Base, Folha de Fecho Base e RAI previsto.',
  forecast: 'Obra em produção. Reorçamento, MCEs, compras, adjudicações, contratos, autos e RAI a final.',
  outturn: 'Fecho final. Analítica, contabilidade, faturação fechada, margem e RAI real.',
  aftercare: 'Pós-venda e garantia. Custos SPV, reclamações, assistências e RAI com SPV incluído.',
};
