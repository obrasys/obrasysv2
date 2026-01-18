// Tipos para o módulo de Conformidade e Livro de Obra

export type AprovacaoTipo = 'rdo' | 'documento' | 'livro_obra' | 'checklist';
export type AprovacaoStatus = 'pendente' | 'aprovado' | 'rejeitado';
export type LivroObraStatus = 'rascunho' | 'pendente' | 'submetido' | 'aprovado' | 'rejeitado';
export type DocumentoTipo = 'licenca' | 'projeto' | 'certificado' | 'relatorio' | 'contrato' | 'outro';
export type ChecklistStatus = 'pendente' | 'em_progresso' | 'concluido';

export interface Aprovacao {
  id: string;
  user_id: string;
  tipo: AprovacaoTipo;
  referencia_id: string;
  solicitante_id: string | null;
  aprovador_id: string | null;
  status: AprovacaoStatus;
  comentarios: string | null;
  data_solicitacao: string;
  data_aprovacao: string | null;
  created_at: string;
  updated_at: string;
  solicitante?: {
    id: string;
    nome: string;
  };
  aprovador?: {
    id: string;
    nome: string;
  };
}

export interface LivroObra {
  id: string;
  user_id: string;
  obra_id: string;
  titulo: string;
  descricao: string | null;
  rdos_incluidos: string[];
  gestor_id: string | null;
  fiscal_id: string | null;
  status: LivroObraStatus;
  data_submissao: string | null;
  data_aprovacao: string | null;
  observacoes_fiscal: string | null;
  created_at: string;
  updated_at: string;
  obra?: {
    id: string;
    nome: string;
    cliente: string | null;
  };
  gestor?: {
    id: string;
    nome: string;
  };
  fiscal?: {
    id: string;
    nome: string;
  };
}

export interface Documento {
  id: string;
  user_id: string;
  obra_id: string;
  nome: string;
  tipo: DocumentoTipo;
  categoria: string | null;
  url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  aprovado: boolean;
  data_validade: string | null;
  created_at: string;
  updated_at: string;
  obra?: {
    id: string;
    nome: string;
  };
  uploader?: {
    id: string;
    nome: string;
  };
}

export interface ChecklistItem {
  id: string;
  descricao: string;
  concluido: boolean;
  observacao?: string;
}

export interface ChecklistConformidade {
  id: string;
  user_id: string;
  obra_id: string;
  titulo: string;
  descricao: string | null;
  itens: ChecklistItem[];
  status: ChecklistStatus;
  responsavel_id: string | null;
  data_verificacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  obra?: {
    id: string;
    nome: string;
  };
  responsavel?: {
    id: string;
    nome: string;
  };
}

export interface LivroObraFormData {
  obra_id: string;
  titulo: string;
  descricao?: string;
  rdos_incluidos?: string[];
  gestor_id?: string;
  fiscal_id?: string;
}

export interface DocumentoFormData {
  obra_id: string;
  nome: string;
  tipo: DocumentoTipo;
  categoria?: string;
  url: string;
  file_size?: number;
  mime_type?: string;
  data_validade?: string;
}

export interface ChecklistFormData {
  obra_id: string;
  titulo: string;
  descricao?: string;
  itens: ChecklistItem[];
  responsavel_id?: string;
}

// Status configurations
export const APROVACAO_STATUS_CONFIG: Record<AprovacaoStatus, { label: string; color: string; bgColor: string }> = {
  pendente: { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  aprovado: { label: 'Aprovado', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejeitado: { label: 'Rejeitado', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const LIVRO_OBRA_STATUS_CONFIG: Record<LivroObraStatus, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  pendente: { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  submetido: { label: 'Submetido', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  aprovado: { label: 'Aprovado', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejeitado: { label: 'Rejeitado', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const DOCUMENTO_TIPO_CONFIG: Record<DocumentoTipo, { label: string; icon: string }> = {
  licenca: { label: 'Licença', icon: 'FileCheck' },
  projeto: { label: 'Projeto', icon: 'FileText' },
  certificado: { label: 'Certificado', icon: 'Award' },
  relatorio: { label: 'Relatório', icon: 'FileBarChart' },
  contrato: { label: 'Contrato', icon: 'FileSignature' },
  outro: { label: 'Outro', icon: 'File' },
};

export const CHECKLIST_STATUS_CONFIG: Record<ChecklistStatus, { label: string; color: string; bgColor: string }> = {
  pendente: { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  em_progresso: { label: 'Em Progresso', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  concluido: { label: 'Concluído', color: 'text-green-700', bgColor: 'bg-green-100' },
};

export const APROVACAO_TIPO_CONFIG: Record<AprovacaoTipo, { label: string }> = {
  rdo: { label: 'Relatório Diário' },
  documento: { label: 'Documento' },
  livro_obra: { label: 'Livro de Obra' },
  checklist: { label: 'Checklist' },
};
