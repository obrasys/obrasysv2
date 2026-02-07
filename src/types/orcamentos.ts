// Tipos para o módulo de orçamentos

export type OrcamentoStatus = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado' | 'adjudicado';

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
  status: OrcamentoStatus;
  valor_total: number;
  margem_lucro: number;
  custos_indiretos: CustosIndiretos;
  data_criacao: string;
  data_envio: string | null;
  created_at: string;
  updated_at: string;
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
  artigos?: ArtigoOrcamento[];
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
  aprovado: { label: 'Aprovado', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejeitado: { label: 'Rejeitado', color: 'text-red-600', bgColor: 'bg-red-100' },
  adjudicado: { label: 'Adjudicado', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};
