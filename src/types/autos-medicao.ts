// Types for Autos de Medição module

export interface AutoMedicao {
  id: string;
  user_id: string;
  obra_id: string;
  orcamento_id?: string | null;
  subempreiteiro_id?: string | null;
  numero_auto: number;
  data_inicio: string;
  data_fim: string;
  data_emissao: string;
  estado: 'rascunho' | 'submetido' | 'validado' | 'aprovado' | 'rejeitado';
  responsavel_medicao: string;
  responsavel_cargo?: string | null;
  responsavel_ordem?: string | null;
  fiscal_obra?: string | null;
  fiscal_entidade?: string | null;
  zona_medicao?: string | null;
  fase_obra?: string | null;
  localizacao_obra?: string | null;
  tipo_contrato?: 'principal' | 'subempreitada' | 'adicional' | null;
  contrato_referencia?: string | null;
  codigo_referencia?: string | null;
  observacoes_tecnicas?: string | null;
  nao_conformidades?: string | null;
  condicoes_execucao?: string | null;
  normas_aplicaveis?: string[] | null;
  idioma?: 'pt' | 'es' | null;
  valor_previsto?: number | null;
  valor_medido_atual?: number | null;
  valor_medido_acumulado?: number | null;
  valor_anterior_acumulado?: number | null;
  percentagem_global?: number | null;
  taxa_iva?: number | null;
  valor_iva?: number | null;
  valor_total_com_iva?: number | null;
  validado_por?: string | null;
  validado_em?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  obra?: {
    id: string;
    nome: string;
    endereco?: string | null;
    cliente_id?: string | null;
  };
  orcamento?: {
    id: string;
    titulo: string;
    valor_total?: number | null;
  };
  subempreiteiro?: {
    id: string;
    nome: string;
    nif?: string | null;
  };
  itens?: AutoMedicaoItem[];
  anexos?: AutoMedicaoAnexo[];
  assinaturas?: AutoMedicaoAssinatura[];
}

export interface AutoMedicaoItem {
  id: string;
  auto_id: string;
  artigo_orcamento_id?: string | null;
  codigo: string;
  descricao: string;
  unidade: string;
  capitulo?: string | null;
  zona?: string | null;
  piso?: string | null;
  localizacao?: string | null;
  quantidade_prevista?: number | null;
  quantidade_anterior?: number | null;
  quantidade_atual?: number | null;
  quantidade_acumulada?: number | null;
  preco_unitario?: number | null;
  valor_previsto?: number | null;
  valor_anterior?: number | null;
  valor_atual?: number | null;
  valor_acumulado?: number | null;
  desvio_percentual?: number | null;
  dentro_tolerancia?: boolean | null;
  tolerancia_maxima?: number | null;
  justificacao_desvio?: string | null;
  observacoes?: string | null;
  ordem?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AutoMedicaoAnexo {
  id: string;
  auto_id: string;
  item_id?: string | null;
  nome: string;
  tipo: 'foto' | 'planta' | 'documento' | 'croqui' | 'outro';
  url: string;
  descricao?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  data_captura?: string | null;
  geolocalizacao?: {
    latitude: number;
    longitude: number;
  } | null;
  created_at: string;
}

export interface AutoMedicaoAssinatura {
  id: string;
  auto_id: string;
  tipo: 'responsavel' | 'fiscal' | 'cliente' | 'subempreiteiro';
  nome: string;
  cargo?: string | null;
  entidade?: string | null;
  email?: string | null;
  estado?: 'pendente' | 'assinado' | 'rejeitado' | null;
  assinatura_url?: string | null;
  assinatura_data?: string | null;
  data_assinatura?: string | null;
  codigo_validacao?: string | null;
  qr_code_url?: string | null;
  ip_address?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export interface AutoMedicaoHistorico {
  id: string;
  auto_id: string;
  versao: number;
  dados_snapshot: Record<string, unknown>;
  tipo_alteracao?: string | null;
  descricao_alteracao?: string | null;
  alterado_por?: string | null;
  created_at: string;
}

export interface AutoMedicaoFormData {
  obra_id: string;
  orcamento_id?: string;
  subempreiteiro_id?: string;
  data_inicio: string;
  data_fim: string;
  responsavel_medicao: string;
  responsavel_cargo?: string;
  responsavel_ordem?: string;
  fiscal_obra?: string;
  fiscal_entidade?: string;
  zona_medicao?: string;
  fase_obra?: string;
  localizacao_obra?: string;
  tipo_contrato?: 'principal' | 'subempreitada' | 'adicional';
  contrato_referencia?: string;
  codigo_referencia?: string;
  observacoes_tecnicas?: string;
  nao_conformidades?: string;
  condicoes_execucao?: string;
  normas_aplicaveis?: string[];
  idioma?: 'pt' | 'es';
  taxa_iva?: number;
}

export interface AutoMedicaoItemFormData {
  artigo_orcamento_id?: string;
  codigo: string;
  descricao: string;
  unidade: string;
  capitulo?: string;
  zona?: string;
  piso?: string;
  localizacao?: string;
  quantidade_prevista?: number;
  quantidade_atual?: number;
  preco_unitario?: number;
  tolerancia_maxima?: number;
  observacoes?: string;
}

// Constants
export const ESTADOS_AUTO = [
  { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  { value: 'submetido', label: 'Submetido', color: 'bg-blue-100 text-blue-800' },
  { value: 'validado', label: 'Validado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  { value: 'rejeitado', label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
] as const;

export const TIPOS_CONTRATO = [
  { value: 'principal', label: 'Contrato Principal' },
  { value: 'subempreitada', label: 'Subempreitada' },
  { value: 'adicional', label: 'Trabalhos Adicionais' },
] as const;

export const TIPOS_ANEXO = [
  { value: 'foto', label: 'Fotografia' },
  { value: 'planta', label: 'Planta/Desenho' },
  { value: 'documento', label: 'Documento' },
  { value: 'croqui', label: 'Croqui' },
  { value: 'outro', label: 'Outro' },
] as const;

export const TIPOS_ASSINATURA = [
  { value: 'responsavel', label: 'Responsável pela Medição' },
  { value: 'fiscal', label: 'Fiscal de Obra' },
  { value: 'cliente', label: 'Cliente/Dono de Obra' },
  { value: 'subempreiteiro', label: 'Subempreiteiro' },
] as const;

export const FASES_OBRA = [
  'Preparação do Terreno',
  'Fundações',
  'Estrutura',
  'Alvenarias',
  'Cobertura',
  'Instalações Técnicas',
  'Revestimentos',
  'Acabamentos',
  'Arranjos Exteriores',
  'Entrega Final',
] as const;

export const NORMAS_APLICAVEIS = {
  pt: [
    'Decreto-Lei n.º 18/2008 - Código dos Contratos Públicos',
    'Portaria n.º 701-H/2008 - Instruções para Medições',
    'LNEC - Especificações Técnicas',
    'Regulamento Geral das Edificações Urbanas',
  ],
  es: [
    'Ley 9/2017 - Contratos del Sector Público',
    'Código Técnico de la Edificación',
    'UNE - Normas Técnicas de Medición',
    'Ley de Ordenación de la Edificación',
  ],
} as const;

export const UNIDADES_MEDIDA = [
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'm³', label: 'Metro Cúbico (m³)' },
  { value: 'ml', label: 'Metro Linear (ml)' },
  { value: 'un', label: 'Unidade (un)' },
  { value: 'cj', label: 'Conjunto (cj)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 't', label: 'Tonelada (t)' },
  { value: 'vg', label: 'Verba Global (vg)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'dia', label: 'Dia' },
  { value: '%', label: 'Percentagem (%)' },
] as const;
