export interface IcfConfiguracao {
  id: string;
  empresa_id: string;
  obra_id: string;
  nome: string;
  versao: number;
  ativo: boolean;
  status: 'rascunho' | 'validado' | 'congelado';
  espessura_nucleo: number;
  classe_betao: string;
  classe_aco: string;
  recobrimento_mm: number | null;
  altura_piso_padrao: number | null;
  tipologia_fundacao: string | null;
  tipologia_laje: string | null;
  fator_perdas: number;
  fator_transpasse: number;
  regras_desconto_vaos: Record<string, unknown>;
  notas_tecnicas: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcfPanoParede {
  id: string;
  empresa_id: string;
  obra_id: string;
  configuracao_id: string;
  referencia: string;
  piso_inicial: string | null;
  piso_final: string | null;
  altura_util: number;
  comprimento: number;
  espessura_nucleo: number;
  area_bruta: number;
  area_vaos: number;
  area_liquida: number;
  volume_betao: number;
  tipo_armadura: string | null;
  armadura_vertical: string | null;
  armadura_horizontal: string | null;
  reforco_transversal: string | null;
  fator_cumprimento: number;
  ordem: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcfVao {
  id: string;
  empresa_id: string;
  pano_id: string;
  tipo_vao: string | null;
  largura: number;
  altura: number;
  quantidade: number;
  area_total: number;
  observacoes: string | null;
  created_at: string;
}

export interface IcfFundacao {
  id: string;
  empresa_id: string;
  obra_id: string;
  configuracao_id: string;
  tipo_fundacao: 'sapata_continua' | 'sapata_isolada' | 'outra';
  referencia: string | null;
  comprimento: number;
  largura: number;
  altura: number;
  quantidade: number;
  volume_betao: number;
  aco_estimado_kg: number | null;
  tensao_admissivel_terreno: number | null;
  tensao_calculo: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcfLaje {
  id: string;
  empresa_id: string;
  obra_id: string;
  configuracao_id: string;
  referencia: string | null;
  piso: string | null;
  tipologia_laje: string | null;
  area: number;
  espessura_total: number;
  volume: number;
  aco_estimado_kg: number | null;
  peso_proprio_kn_m2: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcfResumo {
  obra_id: string;
  configuracao_id: string;
  empresa_id: string;
  config_nome: string;
  config_status: string;
  comprimento_total_paredes: number;
  area_total_paredes: number;
  area_total_vaos: number;
  area_liquida_total: number;
  volume_total_paredes: number;
  volume_total_fundacoes: number;
  volume_total_lajes: number;
  volume_total_obra: number;
  aco_total_fundacoes: number;
  aco_total_lajes: number;
  area_estrutural_total: number;
  indice_m3_m2: number;
  indice_kg_m2: number;
}

export const ICF_ARMADURA_PRESETS = {
  padrao: {
    label: 'Padrão',
    armadura_vertical: 'Ø10/20',
    armadura_horizontal: 'Ø8/20',
    reforco_transversal: null,
  },
  reforcada: {
    label: 'Reforçada',
    armadura_vertical: 'Ø12/20',
    armadura_horizontal: 'Ø10/20',
    reforco_transversal: 'Ø12/20 (1 ou 2 faces)',
  },
} as const;

export const ICF_FUNDACAO_PRESETS = {
  sapata_continua: { comprimento: 1, largura: 0.70, altura: 0.45, label: 'Sapata Contínua (0,70×0,45)' },
  sapata_isolada: { comprimento: 0.70, largura: 0.70, altura: 0.70, label: 'Sapata Isolada (0,70×0,70)' },
} as const;
