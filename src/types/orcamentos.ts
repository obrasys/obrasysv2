// Tipos para o módulo de orçamentos

export type OrcamentoStatus = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'adjudicado' | 'visto' | 'negociacao' | 'cancelado';

export interface CustosIndiretos {
  estaleiro: number;
  seguros: number;
  licenciamento: number;
}

export interface ObraPartial {
  id: string;
  nome: string;
  cliente?: string | null;
}

export interface ProjectMetadata {
  nome_obra?: string;
  numero_lote?: string;
  designacao?: string;
  dono_obra?: string;
  regime_empreitada?: string;
  tipo_obra?: string;
  localizacao?: string;
  prazo_meses?: number;
  numero_fracoes?: number;
  projeto_arquitectura?: string;
  projeto_engenharia?: string;
  responsavel_orcamento?: string;
}

export const REGIME_EMPREITADA_OPTIONS = [
  'Série de Preços',
  'Preço Global',
  'Administração Direta',
  'Outro',
] as const;

export const TIPO_OBRA_OPTIONS = [
  'Nova',
  'Reabilitação',
  'Ampliação',
  'Conservação',
] as const;

export interface Obra extends ObraPartial {
  user_id: string;
  endereco: string | null;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  valor_previsto: number;
  created_at: string;
  updated_at: string;
}

export interface ClientePartial {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  telemovel?: string | null;
  empresa?: string | null;
  nif?: string | null;
  endereco?: string | null;
  codigo_postal?: string | null;
  cidade?: string | null;
}

export interface Orcamento {
  id: string;
  obra_id: string | null;
  cliente_id?: string | null;
  user_id: string;
  titulo: string;
  codigo: string | null;
  status: OrcamentoStatus;
  valor_total: number;
  margem_lucro: number;
  custos_indiretos: CustosIndiretos;
  data_criacao: string;
  data_envio: string | null;
  created_at: string;
  updated_at: string;
  revisao_de?: string | null;
  numero_revisao?: number;
  // Commercial fields
  client_document_mode_default?: string;
  commercial_intro_text?: string | null;
  commercial_payment_terms_text?: string | null;
  commercial_validity_text?: string | null;
  commercial_notes_text?: string | null;
  show_signature_block?: boolean;
  project_metadata?: ProjectMetadata;
  obra?: ObraPartial;
  cliente?: ClientePartial;
  capitulos?: Capitulo[];
}

export interface Capitulo {
  id: string;
  orcamento_id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  ordem: number;
  created_at: string;
  updated_at: string;
  // Commercial summary fields
  client_summary_title?: string | null;
  client_summary_text?: string | null;
  client_exclusions_text?: string | null;
  include_in_client_summary?: boolean;
  client_summary_order?: number | null;
  artigos?: ArtigoOrcamento[];
}

export interface BudgetDocument {
  id: string;
  user_id: string;
  budget_id: string;
  document_type: string;
  view_mode: string;
  storage_path: string;
  generated_at: string;
  sent_to_email?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface ArtigoOrcamento {
  id: string;
  capitulo_id: string;
  codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  preco_base: number;
  margem_lucro_artigo: number;
  valor_total: number;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ArtigoTrabalho {
  id: string;
  user_id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BasePrecos {
  id: string;
  user_id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria: string;
  created_at: string;
  updated_at: string;
}

export interface DefaultArticle {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria: string;
  created_at: string;
}

export interface TemplateCapitulo {
  id: string;
  user_id: string | null;
  titulo: string;
  descricao: string | null;
  artigos: ArtigoTemplate[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArtigoTemplate {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
}

// Form types
export interface OrcamentoFormData {
  titulo: string;
  obra_id?: string;
  cliente_id?: string;
  margem_lucro: number;
  custos_indiretos: CustosIndiretos;
  tipo_obra?: string;
  tipo_cliente?: string;
  tipo_operacao?: string;
  project_metadata?: ProjectMetadata;
}

export interface CapituloFormData {
  numero: number;
  titulo: string;
  descricao?: string;
}

export interface ArtigoFormData {
  codigo?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  // Campo de margem de lucro por artigo (não visível ao cliente)
  preco_base?: number;
  margem_lucro_artigo?: number;
  // Decomposição de custo (6 componentes — somam ao preco_base)
  custo_mo?: number;   // Mão de obra
  custo_mat?: number;  // Materiais
  custo_sub?: number;  // Subempreitadas / Instaladores
  custo_srv?: number;  // Serviços
  custo_alu?: number;  // Alugueres
  custo_div?: number;  // Diversos
  // Campos paramétricos opcionais
  quantity_source?: 'manual' | 'parametric';
  linked_element_id?: string | null;
  linked_rule_id?: string | null;
}


// AI Validation types
export interface AIValidationResult {
  isValid: boolean;
  score: number;
  issues: AIValidationIssue[];
  suggestions: string[];
}

export interface AIValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  capitulo?: string;
  artigo?: string;
}

// Categorias disponíveis
export const CATEGORIAS = [
  'Demolições',
  'Movimentação de Terras',
  'Estruturas',
  'Alvenarias',
  'Revestimentos',
  'Pavimentos',
  'Carpintarias',
  'Serralharias',
  'Pinturas',
  'Instalações Técnicas',
  'Equipamentos',
] as const;

export type Categoria = typeof CATEGORIAS[number];

// Unidades disponíveis
export const UNIDADES = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'm', label: 'Metro linear (m)' },
  { value: 'm2', label: 'Metro quadrado (m²)' },
  { value: 'm3', label: 'Metro cúbico (m³)' },
  { value: 'ml', label: 'Metro linear (ml)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'vg', label: 'Verba global (vg)' },
] as const;

// Status labels e cores
export const STATUS_CONFIG: Record<OrcamentoStatus, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  enviado: { label: 'Enviado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  visto: { label: 'Visto', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  negociacao: { label: 'Em Negociação', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  aprovado: { label: 'Aprovado', color: 'text-green-600', bgColor: 'bg-green-100' },
  adjudicado: { label: 'Adjudicado', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  rejeitado: { label: 'Rejeitado', color: 'text-red-600', bgColor: 'bg-red-100' },
  cancelado: { label: 'Cancelado', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

// States that allow awarding
export const ADJUDICAVEL_STATUSES: OrcamentoStatus[] = ['enviado', 'visto', 'negociacao', 'aprovado'];
