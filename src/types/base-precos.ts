// =============================================
// TIPOS PARA O MÓDULO BASE DE PREÇOS
// =============================================

export type PriceRawStatus = 'pending' | 'accepted' | 'rejected' | 'penalized';
export type SourceType = 'fornecedor' | 'obra' | 'admin' | 'api';
export type AuditAction = 'recalculated' | 'price_accepted' | 'price_rejected' | 'price_penalized' | 'price_inserted';

// Região geográfica
export interface Region {
  id: string;
  nome: string;
  codigo: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

// Categoria de material
export interface MaterialCategory {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string;
  ordem: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

// Material do catálogo
export interface Material {
  id: string;
  category_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  unidade_base: string;
  unidades_alternativas: Record<string, number>[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Relações
  category?: MaterialCategory;
}

// Fonte de preços
export interface PriceSource {
  id: string;
  nome: string;
  tipo: SourceType;
  base_weight: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

// Preço bruto (input)
export interface MaterialPriceRaw {
  id: string;
  material_id: string;
  region_id: string;
  source_id: string;
  user_id: string;
  preco: number;
  unidade_original: string;
  preco_normalizado: number | null;
  observacoes: string | null;
  status: PriceRawStatus;
  motivo_rejeicao: string | null;
  data_referencia: string;
  created_at: string;
  updated_at: string;
  // Relações
  material?: Material;
  region?: Region;
  source?: PriceSource;
}

// Preço de referência (output - read only)
export interface MaterialPriceReference {
  id: string;
  material_id: string;
  region_id: string;
  preco_medio: number;
  preco_p10: number | null;
  preco_p50: number | null;
  preco_p90: number | null;
  sample_size: number;
  confidence_score: number;
  ultima_atualizacao: string;
  created_at: string;
  updated_at: string;
  // Relações
  material?: Material;
  region?: Region;
}

// Log de auditoria
export interface PriceAuditLog {
  id: string;
  material_id: string | null;
  region_id: string | null;
  acao: AuditAction;
  detalhes: Record<string, unknown>;
  executado_por: string;
  created_at: string;
  // Relações
  material?: Material;
  region?: Region;
}

// Formulário de inserção de preço
export interface PriceInputFormData {
  material_id: string;
  region_id: string;
  source_id: string;
  preco: number;
  unidade_original: string;
  observacoes?: string;
  data_referencia?: string;
}

// Filtros para listagem de preços
export interface PriceFilters {
  category_id?: string;
  region_id?: string;
  min_confidence?: number;
  search?: string;
}

// Material com preço de referência (para listagem)
export interface MaterialWithPrice extends Material {
  price_reference?: MaterialPriceReference;
}
