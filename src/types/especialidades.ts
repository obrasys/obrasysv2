/**
 * Tipos da camada Especialidades.
 * Reaproveita storage `plan-files` e padrão de RLS por organização.
 */

export type SpecialtyType =
  | "eletrica"
  | "canalizacao"
  | "esgotos"
  | "avac"
  | "telecomunicacoes"
  | "gas"
  | "seguranca"
  | "outra";

export const SPECIALTY_LABELS: Record<SpecialtyType, string> = {
  eletrica: "Elétrica",
  canalizacao: "Canalização / Águas",
  esgotos: "Esgotos / Drenagem",
  avac: "AVAC",
  telecomunicacoes: "Telecomunicações",
  gas: "Gás",
  seguranca: "Segurança",
  outra: "Outra",
};

export const SPECIALTY_ORDER: SpecialtyType[] = [
  "eletrica",
  "canalizacao",
  "esgotos",
  "avac",
  "telecomunicacoes",
  "gas",
  "seguranca",
  "outra",
];

export type SpecialtyPlanStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "review_required"
  | "validated"
  | "sent_to_budget"
  | "failed";

export interface SpecialtyPlan {
  id: string;
  obra_id: string;
  user_id: string;
  file_path: string;
  file_type: string;
  nome_ficheiro: string;
  specialty_type: SpecialtyType;
  floor_level: string | null;
  declared_scale: string | null;
  estimated_scale: string | null;
  calibration_data: any | null;
  observacoes: string | null;
  status: SpecialtyPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface SpecialtySymbol {
  id: string;
  specialty_type: SpecialtyType;
  symbol_key: string;
  symbol_name: string;
  unit: string;
  description: string | null;
  icon: string | null;
  default_budget_category: string | null;
  default_budget_item_name: string | null;
  active: boolean;
}

export interface SpecialtyDetectedElement {
  id: string;
  specialty_plan_id: string;
  analysis_id: string | null;
  user_id: string;
  symbol_type: string;
  specialty_type: SpecialtyType;
  label: string | null;
  quantity: number;
  unit: string;
  x_position: number | null;
  y_position: number | null;
  bounding_box: any | null;
  page_number: number;
  floor_level: string | null;
  confidence_score: number | null;
  review_required: boolean;
  source: "manual" | "axia" | "imported";
  user_confirmed: boolean;
  created_at: string;
  updated_at: string;
}
