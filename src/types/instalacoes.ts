export type Specialty = 'electrical' | 'plumbing' | 'telecom';
export type Profile = 'eco' | 'med' | 'premium';
export type Complexity = 'simple' | 'normal' | 'complex';
export type PackageStatus = 'draft' | 'sent' | 'active';

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  electrical: 'Elétrica',
  plumbing: 'Canalização',
  telecom: 'Telecomunicações',
};

export const PROFILE_LABELS: Record<Profile, string> = {
  eco: 'Económico',
  med: 'Médio',
  premium: 'Premium',
};

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  simple: 'Simples',
  normal: 'Normal',
  complex: 'Complexa',
};

export const PROFILE_MULTIPLIERS: Record<Profile, number> = {
  eco: 0.90,
  med: 1.00,
  premium: 1.25,
};

export const COMPLEXITY_MULTIPLIERS: Record<Complexity, number> = {
  simple: 0.90,
  normal: 1.00,
  complex: 1.20,
};

export const TYPOLOGY_OPTIONS = ['T0', 'T1', 'T2', 'T3', 'T4+', 'Moradia', 'Apartamento', 'Loja'] as const;

export interface EquipamentoExtra {
  nome: string;
  quantidade: number;
  custo_unitario: number;
}

export interface InstallationPackage {
  id: string;
  user_id: string;
  obra_id: string;
  specialty: Specialty;
  profile: Profile;
  complexity: Complexity;
  typology: string;
  area_m2: number;
  bathrooms: number;
  bedrooms: number;
  kitchen_count: number;
  extra_rooms: number;
  has_laundry: boolean;
  has_bomba_calor: boolean;
  has_termoacumulador: boolean;
  has_piso_radiante: boolean;
  has_paineis_solares: boolean;
  equipamentos_extra: EquipamentoExtra[];
  points_estimated: number;
  points_final: number | null;
  linear_m_estimated: number;
  linear_m_final: number | null;
  total_cost_estimated: number;
  progress_percent: number;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
  obras?: { nome: string };
}

export interface InstallationCoefficient {
  id: string;
  user_id: string;
  specialty: Specialty;
  coefficient_key: string;
  value_numeric: number;
  description: string | null;
}

export interface InstallationCatalogItem {
  id: string;
  user_id: string | null;
  specialty: Specialty;
  profile: Profile;
  name: string;
  unit: string;
  base_qty_type: 'points' | 'linear' | 'fixed';
  cost_material: number;
  cost_labor: number;
  margin_percent: number;
  is_active: boolean;
  is_system: boolean;
}

export interface InstallationPackageItem {
  id: string;
  package_id: string;
  catalog_item_id: string | null;
  name: string;
  unit: string;
  qty: number;
  unit_cost_material: number;
  unit_cost_labor: number;
  margin_percent: number;
  total_cost: number;
  manually_adjusted: boolean;
}

export interface PackageFormData {
  obra_id: string;
  specialty: Specialty;
  profile: Profile;
  complexity: Complexity;
  typology: string;
  area_m2: number;
  bathrooms: number;
  bedrooms: number;
  kitchen_count: number;
  extra_rooms: number;
  has_laundry: boolean;
  has_bomba_calor: boolean;
  has_termoacumulador: boolean;
  has_piso_radiante: boolean;
  has_paineis_solares: boolean;
  equipamentos_extra: EquipamentoExtra[];
}

export interface EstimationResult {
  points: number;
  linearMeters: number;
  items: GeneratedItem[];
  totalCost: number;
}

export interface GeneratedItem {
  catalogItemId?: string;
  name: string;
  unit: string;
  qty: number;
  unitCostMaterial: number;
  unitCostLabor: number;
  marginPercent: number;
  totalCost: number;
}

// Plumbing equipment cost defaults
export const PLUMBING_EQUIPMENT_COSTS: Record<string, { label: string; cost_eco: number; cost_med: number; cost_premium: number }> = {
  bomba_calor: { label: 'Bomba de Calor', cost_eco: 1500, cost_med: 2500, cost_premium: 4000 },
  termoacumulador: { label: 'Termoacumulador', cost_eco: 300, cost_med: 500, cost_premium: 900 },
  piso_radiante: { label: 'Piso Radiante (por m²)', cost_eco: 25, cost_med: 40, cost_premium: 65 },
  paineis_solares: { label: 'Painéis Solares Térmicos', cost_eco: 1200, cost_med: 2000, cost_premium: 3500 },
};

// Default coefficient keys
export const DEFAULT_COEFFICIENTS: Record<Specialty, { key: string; value: number; description: string }[]> = {
  electrical: [
    { key: 'socket_factor', value: 0.35, description: 'Fator tomadas por m²' },
    { key: 'lighting_factor', value: 0.18, description: 'Fator iluminação por m²' },
    { key: 'kitchen_extra_sockets', value: 6, description: 'Tomadas extra cozinha' },
    { key: 'kitchen_extra_points', value: 2, description: 'Pontos extra cozinha (exaustor/forno)' },
    { key: 'wc_sockets', value: 2, description: 'Tomadas por WC' },
    { key: 'wc_lights', value: 1, description: 'Luzes por WC' },
    { key: 'bedroom_sockets', value: 3, description: 'Tomadas por quarto' },
    { key: 'bedroom_lights', value: 1, description: 'Luzes por quarto' },
    { key: 'linear_m_factor', value: 1.6, description: 'Metros lineares por m²' },
  ],
  plumbing: [
    { key: 'wc_water_points', value: 6, description: 'Pontos água por WC' },
    { key: 'kitchen_water_points', value: 4, description: 'Pontos água cozinha' },
    { key: 'laundry_water_points', value: 2, description: 'Pontos água lavandaria' },
    { key: 'wc_drain_points', value: 4, description: 'Pontos esgoto por WC' },
    { key: 'kitchen_drain_points', value: 2, description: 'Pontos esgoto cozinha' },
    { key: 'water_linear_factor', value: 1.0, description: 'Metros lineares água por m²' },
    { key: 'drain_linear_factor', value: 0.8, description: 'Metros lineares esgoto por m²' },
  ],
  telecom: [
    { key: 'living_room_rj45', value: 2, description: 'Pontos RJ45 sala' },
    { key: 'bedroom_rj45', value: 1, description: 'Pontos RJ45 por quarto' },
    { key: 'office_rj45', value: 2, description: 'Pontos RJ45 escritório' },
    { key: 'living_room_coax', value: 1, description: 'Pontos coax sala' },
    { key: 'bedroom_coax', value: 1, description: 'Pontos coax por quarto' },
    { key: 'linear_m_factor', value: 0.7, description: 'Metros lineares por m²' },
  ],
};
