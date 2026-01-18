// =====================================================
// TIPOS PARA MOTOR PARAMÉTRICO BIM-LIKE
// Métodos Construtivos Europeus (PT + ES)
// =====================================================

// Tipos de Elementos
export type ElementType = 'wall' | 'floor' | 'slab' | 'ceiling' | 'roof';

// Métodos Construtivos Europeus (PT + ES)
export type ConstructionMethod = 
  | 'brick_ceramic'       // Tijolo cerâmico PT
  | 'concrete_block'      // Blocos de cimento
  | 'natural_stone'       // Pedra natural
  | 'drywall_pladur'      // Gesso cartonado (Pladur)
  | 'wood_frame'          // Estrutura em madeira
  | 'steel_frame'         // Estrutura em aço galvanizado
  | 'reinforced_concrete'; // Betão armado

// Tipologia Funcional
export type FunctionalType = 'partition_wall' | 'structural_wall';

// Configuração Construtiva
export type ConfigurationType = 'single_layer' | 'double_layer' | 'cavity_wall';

// Fonte da Quantidade
export type QuantitySource = 'manual' | 'parametric';

// Tipo de Isolamento
export type InsulationType = 'mineral_wool' | 'cork' | 'eps' | 'xps' | 'none';

// Tipo de Abertura
export type OpeningType = 'door' | 'window' | 'technical';

// Parâmetros para paredes
export interface WallParameters {
  length_m: number;
  height_m: number;
  thickness_cm: number;
  layer_count: 1 | 2;
  wall_side_count: 1 | 2;
}

// Parâmetros para pavimentos/lajes
export interface FloorParameters {
  length_m: number;
  width_m: number;
  thickness_cm: number;
}

// Parâmetros para cobertura
export interface RoofParameters {
  length_m: number;
  width_m: number;
  thickness_cm: number;
  slope_factor: number;
}

// Elemento Construtivo
export interface ConstructiveElement {
  id: string;
  orcamento_id: string;
  element_type: ElementType;
  name: string;
  construction_method: ConstructionMethod;
  functional_type: FunctionalType;
  configuration_type: ConfigurationType;
  parameters: WallParameters | FloorParameters | RoofParameters;
  insulation_type?: InsulationType | null;
  insulation_thickness_cm?: number | null;
  created_at: string;
  updated_at: string;
}

// Abertura (porta, janela)
export interface ElementOpening {
  id: string;
  element_id: string;
  opening_type: OpeningType;
  name?: string | null;
  width_m: number;
  height_m: number;
  created_at: string;
}

// Parâmetro Calculado (output imutável)
export type CalculatedParameterKey = 
  | 'gross_area_m2' 
  | 'openings_area_m2' 
  | 'net_area_m2' 
  | 'volume_m3' 
  | 'layer_count' 
  | 'wall_side_count';

export interface CalculatedParameter {
  id: string;
  element_id: string;
  key: CalculatedParameterKey;
  value: number;
  unit: string;
  created_at: string;
}

// Regra Paramétrica
export interface ParametricRule {
  id: string;
  user_id: string | null;
  element_type: ElementType;
  construction_method: ConstructionMethod;
  functional_type?: FunctionalType | null;
  configuration_type?: ConfigurationType | null;
  rule_name: string;
  base_parameter: string;
  formula: string;
  unit: string;
  coefficient: number;
  is_system: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

// Log de Auditoria
export interface ParametricAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  element_id: string | null;
  budget_item_id: string | null;
  old_value: number | null;
  new_value: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Resultado de Validação
export interface ValidationResult {
  level: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

// Form data para criação/edição de elemento
export interface ElementFormData {
  name: string;
  element_type: ElementType;
  construction_method: ConstructionMethod;
  functional_type: FunctionalType;
  configuration_type: ConfigurationType;
  insulation_type?: InsulationType;
  insulation_thickness_cm?: number;
  // Parâmetros geométricos
  length_m: number;
  height_m?: number;
  width_m?: number;
  thickness_cm: number;
  layer_count?: 1 | 2;
  wall_side_count?: 1 | 2;
  slope_factor?: number;
}

// Form data para abertura
export interface OpeningFormData {
  name?: string;
  opening_type: OpeningType;
  width_m: number;
  height_m: number;
}

// =====================================================
// CONSTANTES PARA UI
// =====================================================

export const ELEMENT_TYPES: Record<ElementType, string> = {
  wall: 'Parede',
  floor: 'Pavimento',
  slab: 'Laje',
  ceiling: 'Teto',
  roof: 'Cobertura',
};

export const CONSTRUCTION_METHODS: Record<ConstructionMethod, { label: string; region: string; icon?: string }> = {
  brick_ceramic: { label: 'Tijolo Cerâmico', region: 'PT' },
  concrete_block: { label: 'Blocos de Cimento', region: 'PT/ES' },
  natural_stone: { label: 'Pedra Natural', region: 'PT/ES' },
  drywall_pladur: { label: 'Gesso Cartonado (Pladur)', region: 'PT/ES' },
  wood_frame: { label: 'Estrutura em Madeira', region: 'PT/ES' },
  steel_frame: { label: 'Estrutura em Aço', region: 'PT/ES' },
  reinforced_concrete: { label: 'Betão Armado', region: 'PT/ES' },
};

export const FUNCTIONAL_TYPES: Record<FunctionalType, string> = {
  partition_wall: 'Parede de Vedação',
  structural_wall: 'Parede Estrutural',
};

export const CONFIGURATION_TYPES: Record<ConfigurationType, string> = {
  single_layer: 'Camada Simples',
  double_layer: 'Camada Dupla',
  cavity_wall: 'Parede Dupla c/ Caixa de Ar',
};

export const INSULATION_TYPES: Record<InsulationType, string> = {
  mineral_wool: 'Lã Mineral',
  cork: 'Cortiça',
  eps: 'EPS (Poliestireno Expandido)',
  xps: 'XPS (Poliestireno Extrudido)',
  none: 'Sem Isolamento',
};

export const OPENING_TYPES: Record<OpeningType, string> = {
  door: 'Porta',
  window: 'Janela',
  technical: 'Vão Técnico',
};

export const CALCULATED_PARAM_LABELS: Record<CalculatedParameterKey, { label: string; unit: string }> = {
  gross_area_m2: { label: 'Área Bruta', unit: 'm²' },
  openings_area_m2: { label: 'Área de Aberturas', unit: 'm²' },
  net_area_m2: { label: 'Área Líquida', unit: 'm²' },
  volume_m3: { label: 'Volume', unit: 'm³' },
  layer_count: { label: 'Nº Camadas', unit: 'un' },
  wall_side_count: { label: 'Faces a Revestir', unit: 'un' },
};

// Métodos que suportam função estrutural
export const STRUCTURAL_METHODS: ConstructionMethod[] = [
  'brick_ceramic',
  'concrete_block',
  'natural_stone',
  'reinforced_concrete',
  'steel_frame',
];

// Validar se método suporta função estrutural
export function isMethodStructural(method: ConstructionMethod): boolean {
  return STRUCTURAL_METHODS.includes(method);
}

// Valores padrão por tipo de elemento
export const DEFAULT_WALL_PARAMS: Partial<WallParameters> = {
  height_m: 2.7,
  thickness_cm: 15,
  layer_count: 1,
  wall_side_count: 2,
};

export const DEFAULT_FLOOR_PARAMS: Partial<FloorParameters> = {
  thickness_cm: 20,
};

export const DEFAULT_ROOF_PARAMS: Partial<RoofParameters> = {
  thickness_cm: 25,
  slope_factor: 1.1,
};
