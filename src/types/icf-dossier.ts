export type IcfAnalysisStatus =
  | 'rascunho'
  | 'em_classificacao'
  | 'em_revisao'
  | 'validado'
  | 'enviado_orcamento'
  | 'arquivado';

export type IcfDocumentCategory =
  | 'planta'
  | 'corte'
  | 'alcado'
  | 'detalhe'
  | 'mapa_vaos'
  | 'fundacao'
  | 'memoria_descritiva'
  | 'outro';

export type IcfDocumentStatus = 'pending' | 'classified' | 'reviewed' | 'rejected';

export type IcfChecklistStatus = 'pending' | 'present' | 'partial' | 'missing' | 'na';

export type IcfIssueSeverity = 'info' | 'warning' | 'error' | 'critical';
export type IcfIssueCategory =
  | 'missing_document'
  | 'low_confidence'
  | 'inconsistency'
  | 'pending_review'
  | 'calibration'
  | 'other';

export interface IcfProjectAnalysis {
  id: string;
  empresa_id: string;
  user_id: string;
  obra_id: string | null;
  configuracao_id: string | null;
  analysis_mode: 'architectural_to_icf' | 'complete_icf_project' | 'ifc_bim';
  titulo: string;
  descricao: string | null;
  sistema_icf: string | null;
  espessura_nucleo_mm: number | null;
  status: IcfAnalysisStatus;
  axia_confidence: number | null;
  axia_summary: unknown;
  totals_snapshot: unknown;
  created_at: string;
  updated_at: string;
}

export interface IcfProjectDocument {
  id: string;
  analysis_id: string;
  empresa_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  user_category: IcfDocumentCategory | null;
  axia_category: IcfDocumentCategory | null;
  axia_confidence: number | null;
  axia_summary: string | null;
  page_count: number | null;
  status: IcfDocumentStatus;
  created_at: string;
}

export interface IcfChecklistItem {
  id: string;
  analysis_id: string;
  item_key: string;
  item_label: string;
  required: boolean;
  status: IcfChecklistStatus;
  notes: string | null;
  related_document_id: string | null;
  ordem: number;
}

export interface IcfProjectIssue {
  id: string;
  analysis_id: string;
  severity: IcfIssueSeverity;
  category: IcfIssueCategory;
  title: string;
  message: string | null;
  related_document_id: string | null;
  related_panel_id: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface IcfAnalysisSnapshot {
  id: string;
  analysis_id: string;
  version_number: number;
  label: string | null;
  payload: unknown;
  created_by: string | null;
  created_at: string;
}

export const DEFAULT_CHECKLIST: Array<{ key: string; label: string; required: boolean }> = [
  { key: 'plantas', label: 'Plantas de pisos', required: true },
  { key: 'cortes', label: 'Cortes técnicos', required: true },
  { key: 'alcados', label: 'Alçados', required: false },
  { key: 'mapa_vaos', label: 'Mapa de vãos', required: true },
  { key: 'fundacoes', label: 'Plano de fundações', required: true },
  { key: 'detalhes_icf', label: 'Detalhes técnicos ICF', required: false },
  { key: 'memoria', label: 'Memória descritiva', required: false },
];
