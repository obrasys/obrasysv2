// Estrutura detalhada da Folha de Fecho — espelha o modelo Excel
// "Folha de Fecho do Orçamento"

export interface ClosingDirectCostLine {
  key: string;
  label: string;
  value: number;
  empresa?: string;
  notas?: string;
}

export interface ClosingSiteCostLine {
  key: string;
  label: string;
  value: number;
}

export interface ClosingTerrainCosts {
  preco_aquisicao: number;
  area_terreno: number | null;
  custo_loteamento: number;
  taxa_imt_pct: number; // 0.065
  imposto_selo_pct: number; // 0.008
  custos_notario_pct: number; // 0.015
  comissoes_intermediarios: number;
  ensaios_geotecnicos: number;
  levantamento_topografico: number;
  demolicoes_diversas: number;
  arranjos_exteriores: number;
}

export interface ClosingIndirectCosts {
  honorarios_tecnicos: number;
  seguros_pct: number;
  financeiros: number;
  taxas_impostos_prediais_pct: number;
  publicidade_marketing_pct: number; // sobre vendas
  honorarios_gestao: number;
  honorarios_comercializacao_pct: number; // sobre vendas
  garantias_pos_venda: number;
}

export interface ClosingOtherCosts {
  contratos_registos: number;
  projectos_pct: number; // sobre constr.
  imprevistos_aleas_pct: number; // sobre custos indirectos
  outros_taxas_ramais: number;
  seguranca_higiene: number;
  controlo_qualidade: number;
}

export interface ClosingAdminCosts {
  estrutura_overhead: number;
  fee_inter_grupo: number;
  outros_administrativos: number;
}

export interface ClosingIvaCosts {
  zona_aru: boolean;
  zona_oru: boolean;
  taxa_terreno_pct: number; // 0.23
  taxa_construcao_pct: number; // 0.23 ou 0.06
  taxa_honorarios_pct: number; // 0.23
}

export interface ClosingSalesLine {
  key: string;
  tipologia: string;
  quantidade: number;
  area_priv: number;
  preco_m2: number;
}

export interface ClosingStatistics {
  area_construcao: number; // ABP
  area_caves: number;
  area_arranjos_ext: number;
  factor_caves: number; // 0.7
  factor_arranjos: number; // 0.5
}

export interface ClosingHeader {
  nome_obra: string;
  numero_lote: string;
  designacao: string;
  dono_obra: string;
  regime_empreitada: string;
  tipo_obra: string;
  localizacao: string;
  prazo_meses: number | null;
  num_fraccoes: number | null;
  data_orc: string | null;
  inicio_obra: string | null;
  conclusao_obra: string | null;
  numero_obra: string;
  proj_arquitectura: string;
  proj_engenharia: string;
  responsavel_orcamento: string;
}

export interface ClosingConditions {
  estudo_geotecnico: boolean;
  zona_urbana: boolean;
  acessos: boolean;
  energia_electrica: boolean;
  canalizacao_agua: boolean;
  fundacoes_indirectas: boolean;
  rebaixamento_freatico: boolean;
  condicoes_estaleiro: boolean;
  ocupacao_via_publica: boolean;
  observacoes: string;
}

export interface ClosingValidation {
  direccao_geral: string;
  validador_tecnico_economico: string;
  percentagem_lucro_alvo: number; // ex 0.20
  valor_medio_fraccao: number;
  observacoes: string;
}

export interface ClosingApprovals {
  administracao_nome: string;
  administracao_data: string | null;
  aprovacao_inicial_nome: string;
  aprovacao_inicial_data: string | null;
  assinatura_url: string;
  notas: string;
}

export interface ClosingSheetDetails {
  header: ClosingHeader;
  validation: ClosingValidation;
  approvals: ClosingApprovals;
  quality_specs_values: Record<string, string>; // spec_key -> valor descritivo
  direct_costs: ClosingDirectCostLine[];
  site_costs: ClosingSiteCostLine[];
  terrain: ClosingTerrainCosts;
  indirect: ClosingIndirectCosts;
  other: ClosingOtherCosts;
  admin: ClosingAdminCosts;
  iva: ClosingIvaCosts;
  sales: ClosingSalesLine[];
  statistics: ClosingStatistics;
  conditions: ClosingConditions;
  margem_lucro_pct: number; // 0.30
}

export const DEFAULT_DIRECT_COST_LINES: ClosingDirectCostLine[] = [
  { key: "empreitada_chave_mao", label: 'EMPREITADA GERAL "chave na mão"', value: 0 },
  { key: "empreitada_exclusoes", label: "EMPREITADA GERAL c/ EXCLUSÕES", value: 0 },
  { key: "carpintarias", label: "CARPINTARIAS", value: 0 },
  { key: "caixilharias", label: "CAIXILHARIAS + VIDROS", value: 0 },
  { key: "serralharias", label: "SERRALHARIAS", value: 0 },
  { key: "electricas_ited", label: "INSTALAÇÕES ELÉCTRICAS + ITED", value: 0 },
  { key: "avac", label: "AVAC", value: 0 },
  { key: "outras_instalacoes", label: "OUTRAS INSTALAÇÕES", value: 0 },
  { key: "piscinas", label: "PISCINAS", value: 0 },
  { key: "cozinhas", label: "COZINHAS", value: 0 },
  { key: "diversos", label: "DIVERSOS", value: 0 },
  { key: "optimizacao", label: "OPTIMIZAÇÃO PROJECTO / OBRA", value: 0 },
];

export const DEFAULT_SITE_COST_LINES: ClosingSiteCostLine[] = [
  { key: "pessoal_tecnico", label: "PESSOAL TÉCNICO", value: 0 },
  { key: "encarregados", label: "ENCARREGADOS", value: 0 },
  { key: "chefes_equipa", label: "CHEFES DE EQUIPA / SEGUIDOR", value: 0 },
  { key: "utilities", label: "OUTROS GASTOS (ÁGUA/ELECT./TELEF./NET)", value: 0 },
  { key: "equipamentos", label: "EQUIPAMENTOS DE ESTALEIRO", value: 0 },
  { key: "guarda", label: "GUARDA", value: 0 },
  { key: "pessoal_obra", label: "PESSOAL DE OBRA", value: 0 },
  { key: "outro", label: "OUTRO", value: 0 },
];

// Remapeia chaves antigas para o novo conjunto A-G de rubricas de estaleiro.
const LEGACY_SITE_KEY_MAP: Record<string, string> = {
  gestao_obra: "pessoal_tecnico",
  encarregado: "encarregados",
  arvorado: "chefes_equipa",
  pessoal_producao: "pessoal_obra",
};

export function migrateSiteCostLines(
  stored: ClosingSiteCostLine[] | undefined | null,
): ClosingSiteCostLine[] {
  const defaults = DEFAULT_SITE_COST_LINES;
  if (!stored?.length) return defaults.map((l) => ({ ...l }));
  const byKey = new Map<string, number>();
  for (const line of stored) {
    const newKey = LEGACY_SITE_KEY_MAP[line.key] ?? line.key;
    byKey.set(newKey, (byKey.get(newKey) || 0) + (Number(line.value) || 0));
  }
  return defaults.map((d) => ({ ...d, value: byKey.get(d.key) ?? 0 }));
}

export const DEFAULT_CLOSING_DETAILS: ClosingSheetDetails = {
  header: {
    nome_obra: "",
    numero_lote: "",
    designacao: "",
    dono_obra: "",
    regime_empreitada: "Série de Preços",
    tipo_obra: "NOVA",
    localizacao: "",
    prazo_meses: null,
    num_fraccoes: null,
    data_orc: null,
    inicio_obra: null,
    conclusao_obra: null,
    numero_obra: "",
    proj_arquitectura: "",
    proj_engenharia: "",
    responsavel_orcamento: "",
  },
  validation: {
    direccao_geral: "",
    validador_tecnico_economico: "",
    percentagem_lucro_alvo: 0.20,
    valor_medio_fraccao: 0,
    observacoes: "",
  },
  approvals: {
    administracao_nome: "",
    administracao_data: null,
    aprovacao_inicial_nome: "",
    aprovacao_inicial_data: null,
    assinatura_url: "",
    notas: "",
  },
  quality_specs_values: {},
  direct_costs: DEFAULT_DIRECT_COST_LINES,
  site_costs: DEFAULT_SITE_COST_LINES,
  terrain: {
    preco_aquisicao: 0,
    area_terreno: null,
    custo_loteamento: 0,
    taxa_imt_pct: 0.065,
    imposto_selo_pct: 0.008,
    custos_notario_pct: 0.015,
    comissoes_intermediarios: 0,
    ensaios_geotecnicos: 0,
    levantamento_topografico: 0,
    demolicoes_diversas: 0,
    arranjos_exteriores: 0,
  },
  indirect: {
    honorarios_tecnicos: 0,
    seguros_pct: 0.0015,
    financeiros: 0,
    taxas_impostos_prediais_pct: 0.025,
    publicidade_marketing_pct: 0.0005,
    honorarios_gestao: 0,
    honorarios_comercializacao_pct: 0.025,
    garantias_pos_venda: 0,
  },
  other: {
    contratos_registos: 0,
    projectos_pct: 0.015,
    imprevistos_aleas_pct: 0.02,
    outros_taxas_ramais: 0,
    seguranca_higiene: 0,
    controlo_qualidade: 0,
  },
  admin: {
    estrutura_overhead: 0,
    fee_inter_grupo: 0,
    outros_administrativos: 0,
  },
  iva: {
    zona_aru: false,
    zona_oru: false,
    taxa_terreno_pct: 0.23,
    taxa_construcao_pct: 0.23,
    taxa_honorarios_pct: 0.23,
  },
  sales: [],
  statistics: {
    area_construcao: 0,
    area_caves: 0,
    area_arranjos_ext: 0,
    factor_caves: 0.7,
    factor_arranjos: 0.5,
  },
  conditions: {
    estudo_geotecnico: false,
    zona_urbana: false,
    acessos: false,
    energia_electrica: false,
    canalizacao_agua: false,
    fundacoes_indirectas: false,
    rebaixamento_freatico: false,
    condicoes_estaleiro: false,
    ocupacao_via_publica: false,
    observacoes: "",
  },
  margem_lucro_pct: 0.30,
};

// Cálculos derivados (puros — espelham as fórmulas do Excel)

export interface ClosingTotals {
  custo_industrial: number; // (1) directos + estaleiro
  total_directos: number;
  total_estaleiro: number;
  total_terreno: number; // (2)
  total_indirectos: number; // (3)
  total_outros: number; // (4)
  total_admin: number; // (5)
  base_iva_construcao: number;
  total_iva: number; // (6)
  custo_total: number; // (1)+(2)+(3)+(4)+(5)+(6)
  valor_vendas: number;
  rai_eur: number;
  rai_pct: number;
  k_venda: number; // PV / Custo industrial
  custo_m2_equivalente: number;
}

export function computeClosingTotals(d: ClosingSheetDetails): ClosingTotals {
  const total_directos = d.direct_costs.reduce((s, l) => s + (l.value || 0), 0);
  const total_estaleiro = d.site_costs.reduce((s, l) => s + (l.value || 0), 0);
  const custo_industrial = total_directos + total_estaleiro;

  // (2) Terreno
  const baseImpostos = d.terrain.preco_aquisicao || 0;
  const total_terreno =
    baseImpostos +
    (d.terrain.custo_loteamento || 0) +
    baseImpostos * (d.terrain.taxa_imt_pct || 0) +
    baseImpostos * (d.terrain.imposto_selo_pct || 0) +
    baseImpostos * (d.terrain.custos_notario_pct || 0) +
    (d.terrain.comissoes_intermediarios || 0) +
    (d.terrain.ensaios_geotecnicos || 0) +
    (d.terrain.levantamento_topografico || 0) +
    (d.terrain.demolicoes_diversas || 0) +
    (d.terrain.arranjos_exteriores || 0);

  // Vendas
  const valor_vendas = d.sales.reduce(
    (s, l) => s + (l.quantidade || 0) * (l.area_priv || 0) * (l.preco_m2 || 0),
    0,
  );

  // (3) Indirectos
  const total_indirectos =
    (d.indirect.honorarios_tecnicos || 0) +
    custo_industrial * (d.indirect.seguros_pct || 0) +
    (d.indirect.financeiros || 0) +
    custo_industrial * (d.indirect.taxas_impostos_prediais_pct || 0) +
    valor_vendas * (d.indirect.publicidade_marketing_pct || 0) +
    (d.indirect.honorarios_gestao || 0) +
    valor_vendas * (d.indirect.honorarios_comercializacao_pct || 0) +
    (d.indirect.garantias_pos_venda || 0);

  // (4) Outros
  const total_outros =
    (d.other.contratos_registos || 0) +
    custo_industrial * (d.other.projectos_pct || 0) +
    total_indirectos * (d.other.imprevistos_aleas_pct || 0) +
    (d.other.outros_taxas_ramais || 0) +
    (d.other.seguranca_higiene || 0) +
    (d.other.controlo_qualidade || 0);

  // (5) Admin
  const total_admin =
    (d.admin.estrutura_overhead || 0) +
    (d.admin.fee_inter_grupo || 0) +
    (d.admin.outros_administrativos || 0);

  // (6) IVA — apenas se NÃO estiver em ARU/ORU para terreno; construção sempre
  const ivaTerreno = (d.iva.zona_aru || d.iva.zona_oru) ? 0 : total_terreno * (d.iva.taxa_terreno_pct || 0);
  const base_iva_construcao = custo_industrial + total_outros;
  const ivaConstrucao = base_iva_construcao * (d.iva.taxa_construcao_pct || 0);
  const ivaHonorarios = (total_indirectos + total_admin) * (d.iva.taxa_honorarios_pct || 0);
  const total_iva = ivaTerreno + ivaConstrucao + ivaHonorarios;

  const custo_total =
    custo_industrial + total_terreno + total_indirectos + total_outros + total_admin + total_iva;

  const rai_eur = valor_vendas - custo_total;
  const rai_pct = valor_vendas > 0 ? rai_eur / valor_vendas : 0;
  const k_venda = custo_industrial > 0 ? valor_vendas / custo_industrial : 0;

  const areaEq =
    (d.statistics.area_construcao || 0) +
    (d.statistics.area_caves || 0) * (d.statistics.factor_caves || 0) +
    (d.statistics.area_arranjos_ext || 0) * (d.statistics.factor_arranjos || 0);
  const custo_m2_equivalente = areaEq > 0 ? custo_industrial / areaEq : 0;

  return {
    custo_industrial,
    total_directos,
    total_estaleiro,
    total_terreno,
    total_indirectos,
    total_outros,
    total_admin,
    base_iva_construcao,
    total_iva,
    custo_total,
    valor_vendas,
    rai_eur,
    rai_pct,
    k_venda,
    custo_m2_equivalente,
  };
}

export function mergeDetails(stored: Partial<ClosingSheetDetails> | null | undefined): ClosingSheetDetails {
  if (!stored) return structuredClone(DEFAULT_CLOSING_DETAILS);
  return {
    ...DEFAULT_CLOSING_DETAILS,
    ...stored,
    header: { ...DEFAULT_CLOSING_DETAILS.header, ...(stored.header || {}) },
    validation: { ...DEFAULT_CLOSING_DETAILS.validation, ...(stored.validation || {}) },
    approvals: { ...DEFAULT_CLOSING_DETAILS.approvals, ...(stored.approvals || {}) },
    quality_specs_values: { ...(stored.quality_specs_values || {}) },
    direct_costs: stored.direct_costs?.length ? stored.direct_costs : DEFAULT_CLOSING_DETAILS.direct_costs,
    site_costs: migrateSiteCostLines(stored.site_costs),
    terrain: { ...DEFAULT_CLOSING_DETAILS.terrain, ...(stored.terrain || {}) },
    indirect: { ...DEFAULT_CLOSING_DETAILS.indirect, ...(stored.indirect || {}) },
    other: { ...DEFAULT_CLOSING_DETAILS.other, ...(stored.other || {}) },
    admin: { ...DEFAULT_CLOSING_DETAILS.admin, ...(stored.admin || {}) },
    iva: { ...DEFAULT_CLOSING_DETAILS.iva, ...(stored.iva || {}) },
    sales: stored.sales ?? [],
    statistics: { ...DEFAULT_CLOSING_DETAILS.statistics, ...(stored.statistics || {}) },
    conditions: { ...DEFAULT_CLOSING_DETAILS.conditions, ...(stored.conditions || {}) },
  };
}
