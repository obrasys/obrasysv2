export type ICFBlockCategory =
  | 'bloco_principal'
  | 'topo'
  | 'espacador'
  | 'detalhe_tecnico'
  | 'canto'
  | 'meio_bloco'
  | 'especial';

export interface ICFBlockLibraryItem {
  id: string;
  empresa_id: string | null;
  code: string;
  name: string;
  category: ICFBlockCategory;
  length_mm: number | null;
  height_mm: number | null;
  thickness_mm: number | null;
  module_mm: number | null;
  drawing_file: string | null;
  can_be_cut: boolean;
  use_case: string | null;
  notes: string | null;
  system_seed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ICFOpening {
  id?: string;
  type: 'porta' | 'janela' | 'outro';
  width_m: number;
  height_m: number;
  sill_height_m?: number;
  position_m?: number;
}

export type ICFWallPanelStatus =
  | 'rascunho'
  | 'em_revisao'
  | 'validado'
  | 'enviado_orcamento'
  | 'bloqueado';

export interface ICFWallPanel {
  id: string;
  empresa_id: string;
  obra_id: string;
  configuracao_id: string | null;
  source_pano_id: string | null;
  label: string;
  floor: string | null;
  room: string | null;
  length_m: number;
  height_m: number;
  thickness_mm: number;
  selected_block_code: string;
  openings: ICFOpening[];
  gross_area_m2: number;
  net_area_m2: number | null;
  status: ICFWallPanelStatus;
  confidence: number | null;
  source: 'axia' | 'manual' | 'corrigido';
  composition_result: ICFWallCompositionResult | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICFCutSuggestion {
  type: 'horizontal' | 'vertical' | 'opening_adjustment';
  description: string;
  value_mm?: number;
  review_required: boolean;
}

export interface ICFAccessoryEstimate {
  code: string;
  name: string;
  estimated_qty: number;
  unit?: string;
}

export interface ICFWallCompositionResult {
  wall_panel_id: string;
  block_code: string;
  rows: number;
  blocks_per_row: number;
  base_block_qty: number;
  remaining_length_mm: number;
  remaining_height_mm: number;
  openings_area_m2: number;
  estimated_removed_blocks_by_openings: number;
  estimated_final_block_qty: number;
  gross_area_m2: number;
  net_area_m2: number;
  cut_suggestions: ICFCutSuggestion[];
  accessories: ICFAccessoryEstimate[];
  warnings: string[];
  losses_factor: number;
}
