// =============================================
// TIPOS PARA O MÓDULO CADERNOS DE ENCARGOS
// =============================================

export type CadernoStatus = 'importado' | 'a_analisar' | 'analisado' | 'validado' | 'orcamentado';
export type CadernoOrigem = 'cliente' | 'concurso_publico' | 'interno';
export type PerfilPreco = 'economico' | 'medio' | 'premium';
export type ItemStatus = 'pendente' | 'validado' | 'ignorado';

// Caderno principal
export interface CadernoEncargos {
  id: string;
  user_id: string;
  obra_id: string;
  nome: string;
  origem: CadernoOrigem;
  ficheiro_url: string | null;
  ficheiro_nome: string | null;
  ficheiro_tipo: string | null;
  status: CadernoStatus;
  perfil_preco: PerfilPreco;
  orcamento_id: string | null;
  total_itens: number;
  itens_validados: number;
  valor_estimado: number;
  metadados: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Relações
  obra?: {
    id: string;
    nome: string;
    cliente: string | null;
  };
  secoes?: CadernoSecao[];
}

// Secção hierárquica
export interface CadernoSecao {
  id: string;
  caderno_id: string;
  parent_id: string | null;
  codigo: string;
  nome: string;
  nivel: number;
  ordem: number;
  created_at: string;
  // Relações
  itens?: CadernoItem[];
  children?: CadernoSecao[];
}

// Item do caderno
export interface CadernoItem {
  id: string;
  secao_id: string;
  descricao_original: string;
  unidade_detectada: string | null;
  quantidade_detectada: number | null;
  texto_original: string | null;
  ordem: number;
  status: ItemStatus;
  classificacao: ItemClassificacao;
  created_at: string;
  // Relações
  match?: CadernoItemMatch;
  secao?: CadernoSecao;
}

// Classificação do item pela IA
export interface ItemClassificacao {
  tipo_trabalho?: string;
  metodo_construtivo?: string;
  material_principal?: string;
}

// Match com Base de Preços
export interface CadernoItemMatch {
  id: string;
  caderno_item_id: string;
  material_id: string | null;
  artigo_base_id: string | null;
  metodo_construtivo: string | null;
  unidade_sugerida: string | null;
  preco_estimado: number;
  nivel_confianca: number;
  validado: boolean;
  validado_por: string | null;
  validado_em: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Relações
  material?: {
    id: string;
    nome: string;
    codigo: string;
    unidade_base: string;
  };
  artigo_base?: {
    id: string;
    codigo: string;
    descricao: string;
    unidade: string;
    preco_unitario: number;
  };
}

// Formulário de criação do caderno
export interface CadernoFormData {
  nome: string;
  origem: CadernoOrigem;
  ficheiro?: File;
}

// Resultado da análise IA
export interface AnaliseResultado {
  secoes: SecaoAnalise[];
  total_itens: number;
  metadados: {
    tempo_processamento?: number;
    modelo_usado?: string;
    versao?: string;
  };
}

export interface SecaoAnalise {
  codigo: string;
  nome: string;
  nivel: number;
  parent_codigo?: string;
  itens: ItemAnalise[];
}

export interface ItemAnalise {
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  texto_original: string;
  classificacao: ItemClassificacao;
}

// Progresso da análise
export interface AnaliseProgresso {
  etapa: 'leitura' | 'extracao' | 'analise' | 'classificacao' | 'matching' | 'concluido';
  percentagem: number;
  mensagem: string;
}

// Estatísticas do caderno
export interface CadernoEstatisticas {
  total_itens: number;
  itens_validados: number;
  itens_pendentes: number;
  itens_ignorados: number;
  percentagem_validados: number;
  valor_estimado: number;
  confianca_media: number;
  match_alto: number;
  match_medio: number;
  match_baixo: number;
}

// Configurações de status
export const CADERNO_STATUS_CONFIG: Record<CadernoStatus, { label: string; color: string; bgColor: string }> = {
  importado: { label: 'Importado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  a_analisar: { label: 'A Analisar', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  analisado: { label: 'Analisado', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  validado: { label: 'Validado', color: 'text-green-600', bgColor: 'bg-green-100' },
  orcamentado: { label: 'Orçamentado', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

export const CADERNO_ORIGEM_CONFIG: Record<CadernoOrigem, { label: string }> = {
  cliente: { label: 'Cliente' },
  concurso_publico: { label: 'Concurso Público' },
  interno: { label: 'Interno' },
};

export const PERFIL_PRECO_CONFIG: Record<PerfilPreco, { label: string; descricao: string; percentil: string }> = {
  economico: { label: 'Económico', descricao: 'Preços no P10', percentil: 'P10' },
  medio: { label: 'Médio', descricao: 'Preços no P50 (mediana)', percentil: 'P50' },
  premium: { label: 'Premium', descricao: 'Preços no P90', percentil: 'P90' },
};

// Níveis de confiança
export const getNivelConfianca = (confianca: number): { label: string; color: string; bgColor: string } => {
  if (confianca >= 80) return { label: 'Alto', color: 'text-green-600', bgColor: 'bg-green-100' };
  if (confianca >= 50) return { label: 'Médio', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  return { label: 'Baixo', color: 'text-red-600', bgColor: 'bg-red-100' };
};

// Tipos de ficheiro aceites
export const FICHEIRO_TIPOS_ACEITES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/xml': 'XML/BC3',
  'text/xml': 'XML/BC3',
} as const;

export const FICHEIRO_EXTENSOES = ['.pdf', '.docx', '.xlsx', '.xml'];
