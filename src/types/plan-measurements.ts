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
