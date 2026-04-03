export type TipoSolo = 'arenoso' | 'argiloso' | 'rochoso' | 'aterro' | 'misto';
export type ZonaSismica = 'A' | 'B' | 'C' | 'D';
export type Topografia = 'plano' | 'inclinado' | 'acentuado';
export type TipoFundacao = 'sapatas_isoladas' | 'sapata_corrida' | 'ensoleiramento' | 'estacas';

export interface PlanSiteCondition {
  id: string;
  obra_id: string;
  user_id: string;
  tipo_solo: TipoSolo;
  capacidade_portante_kpa: number;
  nivel_freatico_m: number;
  zona_sismica: ZonaSismica;
  topografia: Topografia;
  area_implantacao_m2: number;
  numero_pisos: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanInfraScenario {
  id: string;
  site_condition_id: string;
  user_id: string;
  nome: string;
  tipo_fundacao: TipoFundacao;
  descricao: string | null;
  parametros: Record<string, any>;
  custo_estimado: number;
  selecionado: boolean;
  axia_confidence: number;
  axia_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanInfraItem {
  id: string;
  scenario_id: string;
  artigo_base_id: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  formula_origem: string | null;
  created_at: string;
}

export interface PlanInfraBudgetLink {
  id: string;
  infra_item_id: string;
  user_id: string;
  orcamento_id: string;
  artigo_orcamento_id: string;
  created_at: string;
}

export const TIPO_SOLO_OPTIONS: { value: TipoSolo; label: string }[] = [
  { value: 'arenoso', label: 'Arenoso' },
  { value: 'argiloso', label: 'Argiloso' },
  { value: 'rochoso', label: 'Rochoso' },
  { value: 'aterro', label: 'Aterro' },
  { value: 'misto', label: 'Misto' },
];

export const ZONA_SISMICA_OPTIONS: { value: ZonaSismica; label: string }[] = [
  { value: 'A', label: 'Zona A' },
  { value: 'B', label: 'Zona B' },
  { value: 'C', label: 'Zona C' },
  { value: 'D', label: 'Zona D' },
];

export const TOPOGRAFIA_OPTIONS: { value: Topografia; label: string }[] = [
  { value: 'plano', label: 'Plano' },
  { value: 'inclinado', label: 'Inclinado' },
  { value: 'acentuado', label: 'Acentuado' },
];

export const TIPO_FUNDACAO_OPTIONS: { value: TipoFundacao; label: string }[] = [
  { value: 'sapatas_isoladas', label: 'Sapatas Isoladas' },
  { value: 'sapata_corrida', label: 'Sapata Corrida' },
  { value: 'ensoleiramento', label: 'Ensoleiramento Geral' },
  { value: 'estacas', label: 'Estacas' },
];
