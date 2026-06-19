export type PlantFileStatus = "uploaded" | "processing" | "ready" | "error";
export type PlantSheetStatus =
  | "pending"
  | "processing"
  | "ready"
  | "low_confidence"
  | "error"
  | "approved";
export type PlantElementStatus =
  | "ok"
  | "review"
  | "approved"
  | "edited"
  | "ignored"
  | "error"
  | "proposed";
export type PlantElementReadMethod =
  | "direct_text"
  | "visual_detection"
  | "calculated"
  | "inferred";
export type PlantReviewAction = "approve" | "edit" | "ignore" | "reset";

export interface PlantFile {
  id: string;
  organization_id: string;
  obra_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: PlantFileStatus;
  total_sheets: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantSheet {
  id: string;
  plant_file_id: string;
  organization_id: string;
  obra_id: string;
  sheet_index: number;
  sheet_name: string | null;
  discipline: string | null;
  floor_level: string | null;
  scale: string | null;
  image_path: string | null;
  status: PlantSheetStatus;
  confidence: number | null;
  needs_review: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantElement {
  id: string;
  plant_file_id: string;
  plant_sheet_id: string;
  organization_id: string;
  obra_id: string;
  code: string | null;
  category: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  dimensions_json: Record<string, number> | null;
  coordinates_json: { x?: number; y?: number; w?: number; h?: number } | null;
  source_text: string | null;
  confidence: number | null;
  status: PlantElementStatus;
  read_method: PlantElementReadMethod | null;
  validation_required: boolean;
  budget_chapter_suggestion: string | null;
  budget_item_suggestion: string | null;
  notes: string | null;
  sent_to_budget: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantReviewLog {
  id: string;
  plant_element_id: string;
  organization_id: string;
  reviewed_by: string;
  action: PlantReviewAction;
  old_value_json: any;
  new_value_json: any;
  notes: string | null;
  created_at: string;
}

export interface PlantProcessingLog {
  id: string;
  organization_id: string;
  plant_file_id: string | null;
  plant_sheet_id: string | null;
  step: string;
  status: string;
  message: string | null;
  details_json: any;
  created_at: string;
}

export const PLANT_CATEGORY_COLORS: Record<string, string> = {
  Paredes: "#0F4C5C",
  "Paredes ICF": "#0F4C5C",
  Vigas: "#9A3F3F",
  Pilares: "#9A3F3F",
  Lajes: "#5C7A29",
  Sapatas: "#7A5C29",
  Fundações: "#7A5C29",
  Muros: "#7A5C29",
  Vãos: "#1F6FA8",
  Portas: "#1F6FA8",
  Janelas: "#1F6FA8",
  Escadas: "#A65C00",
  Cobertura: "#5C7A29",
  "Instalações elétricas": "#B58900",
  "Instalações hidráulicas": "#1F8FB0",
  "Áreas": "#666",
  "Compartimentos": "#666",
  Outros: "#444",
};

export const PLANT_CODE_PREFIX_BY_CATEGORY: Record<string, string> = {
  Paredes: "P",
  "Paredes ICF": "PI",
  Vigas: "V",
  Pilares: "PL",
  Lajes: "L",
  Sapatas: "S",
  Fundações: "F",
  Muros: "M",
  Vãos: "VO",
  Portas: "PT",
  Janelas: "JN",
  Escadas: "ES",
  Cobertura: "CO",
  "Instalações elétricas": "E",
  "Instalações hidráulicas": "H",
};
