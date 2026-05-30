// Modelo de dados consolidado para Orçamento & RAI da Obra
// Espelha as tabelas: financial_work_cycles, financial_source_links,
// financial_work_documents, financial_work_lines, guarantee_retentions, aftercare_records.

import type { FinancialPhase } from './orcamento-rai';

export type FinancialCycleStatus = 'draft' | 'active' | 'locked' | 'closed';

export type FinancialSourceModule =
  | 'orcamento'
  | 'closing_sheet'
  | 'mce'
  | 'contracting_package'
  | 'auto_medicao'
  | 'conta_financeira'
  | 'purchase'
  | 'aftercare'
  | 'manual';

export type FinancialLineNature =
  | 'venda'
  | 'custo_direto'
  | 'custo_indireto'
  | 'estaleiro'
  | 'estrutura'
  | 'contingencia'
  | 'spv'
  | 'retencao'
  | 'outro';

export type AftercareStatus = 'aberto' | 'em_analise' | 'resolvido' | 'rejeitado';
export type RetentionStatus = 'retida' | 'liberada_parcial' | 'liberada_total' | 'executada';

export interface FinancialWorkCycle {
  id: string;
  organization_id: string;
  user_id: string;
  obra_id: string;
  phase: FinancialPhase;
  status: FinancialCycleStatus;
  version: number;
  total_vendas: number;
  total_custos: number;
  margem_valor: number;
  margem_pct: number;
  rai: number;
  desvio_budget: number;
  impacto_mce: number;
  custos_spv: number;
  snapshot: Record<string, unknown> | null;
  locked_at: string | null;
  locked_by: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialSourceLink {
  id: string;
  organization_id: string;
  obra_id: string;
  cycle_id: string;
  phase: FinancialPhase;
  source_module: FinancialSourceModule;
  source_id: string;
  source_label: string | null;
  amount: number;
  weight: number;
  ignored: boolean;
  ignored_reason: string | null;
  consolidated_at: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialWorkDocument {
  id: string;
  organization_id: string;
  obra_id: string;
  cycle_id: string;
  source_link_id: string | null;
  source_module: FinancialSourceModule;
  source_id: string | null;
  doc_code: string | null;
  doc_title: string | null;
  doc_date: string | null;
  vendor_id: string | null;
  cost_center_id: string | null;
  total_value: number;
  is_reference: boolean;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialWorkLine {
  id: string;
  organization_id: string;
  obra_id: string;
  cycle_id: string;
  document_id: string | null;
  nature: FinancialLineNature;
  chapter_code: string | null;
  family_code: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  total_cost: number;
  unit_sale: number;
  total_sale: number;
  margin_pct: number;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface GuaranteeRetention {
  id: string;
  organization_id: string;
  user_id: string;
  obra_id: string;
  cycle_id: string | null;
  source_module: FinancialSourceModule | null;
  source_id: string | null;
  supplier_id: string | null;
  description: string | null;
  retained_amount: number;
  released_amount: number;
  due_date: string | null;
  released_at: string | null;
  status: RetentionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AftercareRecord {
  id: string;
  organization_id: string;
  user_id: string;
  obra_id: string;
  cycle_id: string | null;
  cost_center_id: string | null;
  reference: string | null;
  description: string | null;
  category: string | null;
  reported_at: string;
  resolved_at: string | null;
  cost_value: number;
  status: AftercareStatus;
  supplier_id: string | null;
  attachments: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
