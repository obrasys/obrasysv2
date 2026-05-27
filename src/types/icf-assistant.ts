export type IcfSourceType =
  | 'extraido_planta'
  | 'calculado_sistema'
  | 'sugerido_axia'
  | 'confirmado_utilizador';

export type IcfPlanKind = 'arquitetura' | 'estrutural' | 'icf' | 'desconhecido';

export type IcfAssistantItemCategory =
  | 'parede_ext'
  | 'parede_int'
  | 'vao'
  | 'fundacao'
  | 'laje'
  | 'extra';

export interface IcfAssistantSession {
  id: string;
  organization_id: string;
  obra_id: string | null;
  user_id: string;
  plan_kind: IcfPlanKind;
  file_path: string | null;
  scale_m_per_px: number | null;
  espessura_nucleo: number;
  classe_betao: string;
  classe_aco: string;
  foundations_found: boolean;
  foundation_option: string | null;
  foundation_params: Record<string, unknown>;
  current_step: number;
  status: 'rascunho' | 'pre_orcamento' | 'validado';
  axia_audit: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcfAssistantItem {
  id: string;
  session_id: string;
  organization_id: string;
  category: IcfAssistantItemCategory;
  reference: string | null;
  is_icf_candidate: boolean;
  user_confirmed: boolean;
  quantity: number | null;
  unit: string | null;
  attributes: Record<string, any>;
  source_type: IcfSourceType;
  review_required: boolean;
  confidence: number;
  assumptions: string[];
  notes: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export const FOUNDATIONS_NOT_FOUND_MESSAGE =
  'Não foram identificadas fundações ou sapatas na planta arquitetónica. A Axia pode sugerir uma solução preliminar para orçamento, mas a definição final deve ser validada por técnico/engenheiro responsável.';

export type FoundationOptionKey =
  | 'sapata_continua'
  | 'laje_terrea_bordo'
  | 'stem_wall'
  | 'cave_basement'
  | 'radier'
  | 'nenhuma';
