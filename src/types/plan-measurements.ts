export type PlanImportStatus = 'pendente' | 'calibrada' | 'medida' | 'validada';
export type PlanDisciplina = 'arquitetura' | 'estruturas' | 'eletrica' | 'canalizacao' | 'avac' | 'telecom' | 'outra';
export type MeasurementType = 'linha' | 'area' | 'contagem';
export type ValidationState = 'pendente' | 'validado' | 'rejeitado';
export type MappingState = 'mapeado' | 'por_mapear' | 'incompativel';
export type CalibrationStatus = 'pendente' | 'valida' | 'invalida';

export interface PlanImport {
  id: string;
  obra_id: string;
  user_id: string;
  file_path: string;
  file_type: string;
  nome_ficheiro: string;
  disciplina: PlanDisciplina;
  revision_number: number;
  data_planta: string | null;
  observacoes: string | null;
  status: PlanImportStatus;
  created_at: string;
  updated_at: string;
}

export interface PlanCalibration {
  id: string;
  plan_import_id: string;
  user_id: string;
  point1: { x: number; y: number };
  point2: { x: number; y: number };
  real_distance: number;
  pixels_per_meter: number;
  unidade: string;
  status: CalibrationStatus;
  created_at: string;
  updated_at: string;
}

export interface PlanMeasurement {
  id: string;
  plan_import_id: string;
  user_id: string;
  tipo: MeasurementType;
  coordinates: Array<{ x: number; y: number }>;
  valor_bruto: number;
  valor_ajustado: number | null;
  valor_final: number | null;
  unidade: string;
  camada: string | null;
  etiqueta: string | null;
  cor: string;
  observacao: string | null;
  estado_validacao: ValidationState;
  created_at: string;
  updated_at: string;
}

export interface PlanMeasurementMapping {
  id: string;
  measurement_id: string;
  user_id: string;
  capitulo_id: string | null;
  artigo_base_id: string | null;
  unidade_artigo: string | null;
  formula_conversao: string | null;
  fator_desperdicio: number;
  coeficiente: number;
  estado: MappingState;
  created_at: string;
  updated_at: string;
}

export interface PlanBudgetLink {
  id: string;
  measurement_id: string;
  user_id: string;
  orcamento_id: string;
  artigo_orcamento_id: string;
  created_at: string;
}

export const DISCIPLINA_OPTIONS: { value: PlanDisciplina; label: string }[] = [
  { value: 'arquitetura', label: 'Arquitetura' },
  { value: 'estruturas', label: 'Estruturas' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'canalizacao', label: 'Canalização' },
  { value: 'avac', label: 'AVAC' },
  { value: 'telecom', label: 'Telecomunicações' },
  { value: 'outra', label: 'Outra' },
];

export const CAMADA_OPTIONS = [
  'paredes', 'pavimentos', 'tetos', 'cobertura', 'fachada',
  'instalacoes', 'estrutura', 'vãos', 'outra'
];

// ── Room / Compartment types ──
export type TipoCompartimento = 'habitacao' | 'servico' | 'circulacao' | 'tecnico';
export type OrigemDado = 'manual' | 'ia_inferida';

export interface PlanRoom {
  id: string;
  plan_import_id: string;
  user_id: string;
  nome: string;
  tipo_compartimento: TipoCompartimento;
  boundary_coords: Array<{ x: number; y: number }>;
  area_m2: number;
  perimetro_m: number;
  pe_direito_m: number;
  observacao: string | null;
  estado_validacao: ValidationState;
  origem: OrigemDado;
  created_at: string;
  updated_at: string;
}

export interface PlanRoomMeasurement {
  id: string;
  room_id: string;
  measurement_id: string;
  created_at: string;
}

// ── Wall types ──
export type TipoFuncionalParede = 'exterior' | 'interior_divisoria' | 'interior_estrutural';
export type MaterialParede = 'alvenaria' | 'betao' | 'gesso_cartonado' | 'outro';

export interface PlanWall {
  id: string;
  plan_import_id: string;
  user_id: string;
  room_id: string | null;
  start_point: { x: number; y: number };
  end_point: { x: number; y: number };
  comprimento_m: number;
  espessura_cm: number;
  tipo_funcional: TipoFuncionalParede;
  material: MaterialParede;
  observacao: string | null;
  origem: OrigemDado;
  created_at: string;
  updated_at: string;
}

// ── Opening types ──
export type TipoVao = 'porta' | 'janela' | 'portada' | 'claraboia';

export interface PlanOpening {
  id: string;
  wall_id: string;
  user_id: string;
  tipo: TipoVao;
  largura_m: number;
  altura_m: number;
  peitoril_m: number | null;
  posicao_na_parede: { x: number; y: number } | null;
  observacao: string | null;
  origem: OrigemDado;
  created_at: string;
  updated_at: string;
}

export const TIPO_COMPARTIMENTO_OPTIONS: { value: TipoCompartimento; label: string }[] = [
  { value: 'habitacao', label: 'Habitação' },
  { value: 'servico', label: 'Serviço' },
  { value: 'circulacao', label: 'Circulação' },
  { value: 'tecnico', label: 'Técnico' },
];

export const TIPO_FUNCIONAL_OPTIONS: { value: TipoFuncionalParede; label: string }[] = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior_divisoria', label: 'Interior Divisória' },
  { value: 'interior_estrutural', label: 'Interior Estrutural' },
];

export const MATERIAL_PAREDE_OPTIONS: { value: MaterialParede; label: string }[] = [
  { value: 'alvenaria', label: 'Alvenaria' },
  { value: 'betao', label: 'Betão' },
  { value: 'gesso_cartonado', label: 'Gesso Cartonado' },
  { value: 'outro', label: 'Outro' },
];

export const TIPO_VAO_OPTIONS: { value: TipoVao; label: string }[] = [
  { value: 'porta', label: 'Porta' },
  { value: 'janela', label: 'Janela' },
  { value: 'portada', label: 'Portada' },
  { value: 'claraboia', label: 'Clarabóia' },
];
