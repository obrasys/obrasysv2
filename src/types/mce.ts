// MCE — Mapa Comparativo Económico (types)

export type MceCategory = 'SUB' | 'SRV' | 'MAT' | 'MO' | 'INS' | 'ALU';

export const MCE_CATEGORY_LABELS: Record<MceCategory, string> = {
  SUB: 'SUB — Subempreitadas',
  SRV: 'SRV — Prestação de Serviços',
  MAT: 'MAT — Fornecimentos',
  MO: 'M.O. — Mão de Obra',
  INS: 'INS — Instalações Especiais',
  ALU: 'ALU — Equipamentos / Alugueres',
};

export type MceStatus =
  | 'rascunho'
  | 'em_consulta'
  | 'propostas_recebidas'
  | 'em_analise'
  | 'validacao_tecnica'
  | 'validacao_financeira'
  | 'em_aprovacao'
  | 'aprovado'
  | 'adjudicado'
  | 'em_execucao'
  | 'fechado'
  | 'cancelado';

export const MCE_STATUS_LABELS: Record<MceStatus, string> = {
  rascunho: 'Rascunho',
  em_consulta: 'Em consulta',
  propostas_recebidas: 'Propostas recebidas',
  em_analise: 'Em análise',
  validacao_tecnica: 'Validação técnica',
  validacao_financeira: 'Validação financeira',
  em_aprovacao: 'Em aprovação',
  aprovado: 'Aprovado',
  adjudicado: 'Adjudicado',
  em_execucao: 'Em execução',
  fechado: 'Fechado',
  cancelado: 'Cancelado',
};

export type MceProposalStatus =
  | 'pendente'
  | 'recebida'
  | 'incompleta'
  | 'validada'
  | 'excluida'
  | 'selecionada';

export interface MceMap {
  id: string;
  user_id: string;
  organization_id: string;
  obra_id: string;
  source_budget_id: string | null;
  budget_version_id: string | null;
  budget_line_id: string | null;
  cost_center_id: string | null;
  mce_number: string | null;
  work_number: string | null;
  work_lot: string | null;
  work_name: string | null;
  work_location: string | null;
  project_manager_name: string | null;
  contractual_reference: string | null;
  category: MceCategory | null;
  category_label: string | null;
  title: string;
  description: string | null;
  dry_budget_total: number;
  selected_supplier_id: string | null;
  selected_supplier_total: number;
  awarded_value: number;
  gain_loss_value: number;
  gain_loss_percentage: number;
  status: MceStatus;
  technical_requirements: string | null;
  observations: string | null;
  date_fornecimento: string | null;
  date_contrato: string | null;
  date_comparativo: string | null;
  approved_at: string | null;
  awarded_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MceSupplier {
  id: string;
  mce_id: string;
  supplier_id: string | null;
  position: number;
  supplier_name_snapshot: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  nif: string | null;
  license_number: string | null;
  payment_terms: string | null;
  retention: string | null;
  proposal_status: MceProposalStatus;
  proposal_total: number;
  is_selected: boolean;
  selection_reason: string | null;
  commercial_observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface MceItem {
  id: string;
  mce_id: string;
  budget_line_id: string | null;
  quantity: number;
  unit: string | null;
  specification: string | null;
  dry_budget_quantity: number;
  dry_budget_unit_price: number;
  dry_budget_total: number;
  sort_order: number;
  notes: string | null;
  excluded: boolean;
  created_at: string;
  updated_at: string;
}

export interface MceSupplierItemPrice {
  id: string;
  mce_id: string;
  mce_item_id: string;
  mce_supplier_id: string;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export interface MceAttachment {
  id: string;
  mce_id: string;
  mce_supplier_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  attachment_type: string | null;
  created_at: string;
}
