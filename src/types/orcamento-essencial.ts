// Types for the redesigned Orçamento Essencial page

export type BudgetType = 'remodelacao' | 'construcao_nova' | 'lsf' | 'icf';

export interface BudgetTypeOption {
  value: BudgetType;
  label: string;
  subtitle: string;
}

export const BUDGET_TYPES: BudgetTypeOption[] = [
  { value: 'remodelacao', label: 'Remodelação', subtitle: 'Obras de remodelação / reabilitação' },
  { value: 'construcao_nova', label: 'Construção Nova', subtitle: 'Construção de raiz / obra nova' },
  { value: 'lsf', label: 'LSF', subtitle: 'Light Steel Frame' },
  { value: 'icf', label: 'ICF', subtitle: 'Insulated Concrete Forms' },
];

export interface AreaConfig {
  key: string;
  label: string;
  isCustom?: boolean;
}

export const AREAS_REMODELACAO: AreaConfig[] = [
  { key: 'aguas_esgotos', label: 'Águas e Esgotos' },
  { key: 'ar_condicionados', label: 'Ar Condicionados' },
  { key: 'capoto', label: 'Capoto' },
  { key: 'carpintaria', label: 'Carpintaria' },
  { key: 'casa_banho', label: 'Casa de Banho' },
  { key: 'cozinha', label: 'Cozinha' },
  { key: 'demolicoes_recolha', label: 'Demolições Recolha' },
  { key: 'demolicoes', label: 'Demolições' },
  { key: 'deslocacao_estaleiro', label: 'Deslocação/Estaleiro' },
  { key: 'eletrica', label: 'Elétrica' },
  { key: 'impermeabilizacao', label: 'Impermeabilização' },
  { key: 'imprevistos_tpu', label: 'Imprevistos/TPU' },
  { key: 'jardim', label: 'Jardim' },
  { key: 'pavimentos_rodapes', label: 'Pavimentos e Rodapés' },
  { key: 'pinturas', label: 'Pinturas' },
  { key: 'piscinas', label: 'Piscinas' },
  { key: 'pladur', label: 'Pladur' },
  { key: 'serralharia_caixilharia', label: 'Serralharia e Caixilharia' },
  { key: 'tectos_sancas', label: 'Tectos e Sancas' },
  { key: 'telhados', label: 'Telhados' },
];

export const AREAS_CONSTRUCAO_NOVA: AreaConfig[] = [
  { key: 'preparacao_terras', label: '1 - Preparação e Mov. Terras' },
  { key: 'fundacoes_laje', label: '2 - Fundações e Laje' },
  { key: 'estrutura_betao', label: '3 - Estrutura em Betão Armado' },
  { key: 'paredes_exteriores', label: '4 - Paredes Exteriores' },
  { key: 'paredes_interiores', label: '5 - Paredes Interiores' },
  { key: 'coberturas_telhados', label: '6 - Coberturas' },
  { key: 'impermeabilizacao_isolamento', label: '7 - Impermeabilizações e Isolamento' },
  { key: 'instalacoes_aguas', label: '8 - Instalações Hidráulicas' },
  { key: 'instalacoes_eletricas', label: '9 - Instalações Elétricas' },
  { key: 'rebocos_estuques', label: '10 - Rebocos / Estuques / Gesso' },
  { key: 'tetos_falsos_pladur', label: '11 - Tetos Falsos e Pladur' },
  { key: 'pavimentos_revestimentos', label: '12 - Pavimentos e Revestimentos' },
  { key: 'caixilharias_exteriores', label: '13 - Caixilharias Exteriores' },
  { key: 'carpintarias_interiores', label: '14 - Carpintarias Interiores' },
  { key: 'pinturas_cn', label: '15 - Pinturas' },
  { key: 'loucas_sanitarios', label: '16 - Louças, Sanitários e Equipamentos' },
  { key: 'arranjos_exteriores', label: '17 - Arranjos Exteriores' },
];

export const AREAS_LSF: AreaConfig[] = [
  { key: 'lsf_preparacao_terras', label: '1 - Preparação e Mov. Terras' },
  { key: 'lsf_fundacao_laje', label: '2 - Fundação / Laje Base' },
  { key: 'lsf_estrutura', label: '3 - Estrutura LSF' },
  { key: 'lsf_fecho_exterior', label: '4 - Fecho Exterior LSF' },
  { key: 'lsf_divisorias', label: '5 - Divisórias Interiores' },
  { key: 'lsf_cobertura', label: '6 - Cobertura LSF' },
  { key: 'lsf_isolamentos', label: '7 - Isolamentos Térmicos/Acústicos' },
  { key: 'lsf_fachada', label: '8 - Fachada Exterior' },
  { key: 'lsf_instalacoes_aguas', label: '9 - Instalações Hidráulicas' },
  { key: 'lsf_instalacoes_eletricas', label: '10 - Instalações Elétricas' },
  { key: 'lsf_rebocos_estuques', label: '11 - Rebocos / Estuques / Gesso' },
  { key: 'lsf_tetos_falsos', label: '12 - Tetos Falsos e Pladur' },
  { key: 'lsf_pavimentos', label: '13 - Pavimentos e Revestimentos' },
  { key: 'lsf_caixilharias', label: '14 - Caixilharias Exteriores' },
  { key: 'lsf_carpintarias', label: '15 - Carpintarias Interiores' },
  { key: 'lsf_pinturas', label: '16 - Pinturas' },
  { key: 'lsf_loucas_sanitarios', label: '17 - Louças, Sanitários e Equipamentos' },
  { key: 'lsf_arranjos_exteriores', label: '18 - Arranjos Exteriores' },
];

export const AREAS_ICF: AreaConfig[] = [
  { key: 'icf_preparacao_terras', label: '1 - Preparação e Mov. Terras' },
  { key: 'icf_fundacoes_laje', label: '2 - Fundações e Laje Base' },
  { key: 'icf_paredes_estruturais', label: '3 - Paredes Estruturais ICF' },
  { key: 'icf_lajes_cobertura', label: '4 - Lajes / Cobertura' },
  { key: 'icf_impermeabilizacao', label: '5 - Impermeabilização' },
  { key: 'icf_instalacoes_aguas', label: '6 - Instalações Hidráulicas' },
  { key: 'icf_instalacoes_eletricas', label: '7 - Instalações Elétricas' },
  { key: 'icf_revestimento_interior', label: '8 - Revestimento Interior' },
  { key: 'icf_revestimento_exterior', label: '9 - Revestimento Exterior' },
  { key: 'icf_tetos_falsos', label: '10 - Tetos Falsos e Pladur' },
  { key: 'icf_pavimentos', label: '11 - Pavimentos e Revestimentos' },
  { key: 'icf_caixilharias', label: '12 - Caixilharias Exteriores' },
  { key: 'icf_carpintarias', label: '13 - Carpintarias Interiores' },
  { key: 'icf_pinturas', label: '14 - Pinturas' },
  { key: 'icf_loucas_sanitarios', label: '15 - Louças, Sanitários e Equipamentos' },
  { key: 'icf_arranjos_exteriores', label: '16 - Arranjos Exteriores' },
];

export function getAreasForType(type: BudgetType): AreaConfig[] {
  switch (type) {
    case 'remodelacao': return AREAS_REMODELACAO;
    case 'construcao_nova': return AREAS_CONSTRUCAO_NOVA;
    case 'lsf': return AREAS_LSF;
    case 'icf': return AREAS_ICF;
  }
}

export interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  laborPrice: number;
  materialPrice: number;
}

// Default catalog items per area key
export const DEFAULT_CATALOG: Record<string, CatalogItem[]> = {
  aguas_esgotos: [
    { id: 'ae_1', name: 'Deslocação de ponto de água/esgoto (≤2 m)', unit: 'un', laborPrice: 70, materialPrice: 30 },
    { id: 'ae_2', name: 'Instalação de rede de águas (por m² casa de banho)', unit: 'm²', laborPrice: 20, materialPrice: 20 },
    { id: 'ae_3', name: 'Instalação de rede de águas (por m² cozinha)', unit: 'm²', laborPrice: 25, materialPrice: 22 },
    { id: 'ae_4', name: 'Instalação de rede de esgotos (por m² casa de banho)', unit: 'm²', laborPrice: 15, materialPrice: 20 },
    { id: 'ae_5', name: 'Instalação de rede de esgotos (por m² cozinha)', unit: 'm²', laborPrice: 22, materialPrice: 35 },
    { id: 'ae_6', name: 'Instalação total T0 a T3', unit: 'vg', laborPrice: 1000, materialPrice: 1100 },
    { id: 'ae_7', name: 'Ligação de máquina (lava-louça / lava-roupa)', unit: 'un', laborPrice: 35, materialPrice: 15 },
    { id: 'ae_8', name: 'Ponto de água (por ponto)', unit: 'un', laborPrice: 90, materialPrice: 70 },
    { id: 'ae_9', name: 'Ponto de esgoto (por ponto)', unit: 'un', laborPrice: 65, materialPrice: 35 },
    { id: 'ae_10', name: 'Ralo sifonado de pavimento', unit: 'un', laborPrice: 60, materialPrice: 45 },
    { id: 'ae_11', name: 'Sifão e ligação de lavatório/lava-louça', unit: 'un', laborPrice: 25, materialPrice: 20 },
    { id: 'ae_12', name: 'Substituição de coluna/montante (água fria/quente)', unit: 'un', laborPrice: 280, materialPrice: 170 },
  ],
  ar_condicionados: [
    { id: 'ac_1', name: 'Apoios antivibração (kit 4 pés)', unit: 'lote', laborPrice: 15, materialPrice: 40 },
    { id: 'ac_2', name: 'Base ao solo em PVC/betão para unidade exterior', unit: 'un', laborPrice: 15, materialPrice: 18 },
    { id: 'ac_3', name: 'Calha técnica 80x60 mm (por metro)', unit: 'ml', laborPrice: 8, materialPrice: 12 },
    { id: 'ac_4', name: 'Circuito elétrico dedicado até 10 m + disjuntor', unit: 'lote', laborPrice: 100, materialPrice: 50 },
    { id: 'ac_5', name: 'Corte/selagem de atravessamentos (até Ø60 mm)', unit: 'un', laborPrice: 10, materialPrice: 6 },
    { id: 'ac_6', name: 'Fornecimento e montagem de calha técnica', unit: 'ml', laborPrice: 8, materialPrice: 12 },
    { id: 'ac_7', name: 'Furação com broca em betão', unit: 'furo', laborPrice: 20, materialPrice: 2 },
    { id: 'ac_8', name: 'Furo Ø65 mm passagem tubagens', unit: 'furo', laborPrice: 30, materialPrice: 3 },
    { id: 'ac_9', name: 'Linha de dreno PVC 20–25 mm', unit: 'ml', laborPrice: 5, materialPrice: 3 },
    { id: 'ac_10', name: 'Par de cobre isolado 1/4"+3/8"', unit: 'm', laborPrice: 8, materialPrice: 16 },
    { id: 'ac_11', name: 'Preparação de área de trabalho', unit: 'un', laborPrice: 20, materialPrice: 7 },
    { id: 'ac_12', name: 'Seccionador próximo da unidade exterior', unit: 'un', laborPrice: 20, materialPrice: 20 },
    { id: 'ac_13', name: 'Suportes murais para unidade exterior', unit: 'par', laborPrice: 20, materialPrice: 30 },
  ],
  capoto: [
    { id: 'cap_1', name: 'Acabamento acrílico/texturado tipo reboco raspado', unit: 'm²', laborPrice: 6, materialPrice: 5 },
    { id: 'cap_2', name: 'Aplicação sistema capoto ETICS', unit: 'm²', laborPrice: 22, materialPrice: 28 },
    { id: 'cap_3', name: 'Barramento e reparação de fissuras em fachada', unit: 'ml', laborPrice: 4, materialPrice: 2.5 },
    { id: 'cap_4', name: 'Montagem e desmontagem de andaime de fachada', unit: 'm²', laborPrice: 6, materialPrice: 4 },
    { id: 'cap_5', name: 'Pintura de fachada exterior', unit: 'm²', laborPrice: 5, materialPrice: 3 },
    { id: 'cap_6', name: 'Reboco e regularização de fachada exterior', unit: 'm²', laborPrice: 12, materialPrice: 8 },
  ],
  carpintaria: [
    { id: 'carp_1', name: 'Ajuste/afinação de porta existente', unit: 'un', laborPrice: 25, materialPrice: 5 },
    { id: 'carp_2', name: 'Caixilharia/tapamento de vãos em MDF', unit: 'ml', laborPrice: 18, materialPrice: 12 },
    { id: 'carp_3', name: 'Fornecimento e assentamento de bancada', unit: 'ml', laborPrice: 35, materialPrice: 60 },
    { id: 'carp_4', name: 'Instalação de guarnições / aduelas', unit: 'un', laborPrice: 30, materialPrice: 35 },
    { id: 'carp_5', name: 'Prateleira flutuante', unit: 'un', laborPrice: 20, materialPrice: 25 },
    { id: 'carp_6', name: 'Painel/boiserie decorativa', unit: 'm²', laborPrice: 28, materialPrice: 22 },
    { id: 'carp_7', name: 'Porta de correr embutida', unit: 'un', laborPrice: 140, materialPrice: 220 },
    { id: 'carp_8', name: 'Porta de entrada interior', unit: 'un', laborPrice: 120, materialPrice: 400 },
    { id: 'carp_9', name: 'Porta interior com aro e guarnição', unit: 'un', laborPrice: 60, materialPrice: 140 },
    { id: 'carp_10', name: 'Rodapés MDF lacado', unit: 'ml', laborPrice: 4, materialPrice: 3.5 },
    { id: 'carp_11', name: 'Móvel casa de banho MDF lacado', unit: 'un', laborPrice: 80, materialPrice: 300 },
    { id: 'carp_12', name: 'Móvel inferior cozinha', unit: 'ml', laborPrice: 110, materialPrice: 350 },
    { id: 'carp_13', name: 'Roupeiro embutido portas abrir', unit: 'ml', laborPrice: 120, materialPrice: 250 },
    { id: 'carp_14', name: 'Roupeiro embutido portas correr', unit: 'ml', laborPrice: 140, materialPrice: 280 },
  ],
  casa_banho: [
    { id: 'cb_1', name: 'Armário espelho / espelho LED', unit: 'un', laborPrice: 35, materialPrice: 50 },
    { id: 'cb_2', name: 'Conjunto torneiras', unit: 'un', laborPrice: 50, materialPrice: 229 },
    { id: 'cb_3', name: 'Espelho', unit: 'un', laborPrice: 30, materialPrice: 100 },
    { id: 'cb_4', name: 'Espelho com fixação', unit: 'un', laborPrice: 20, materialPrice: 50 },
    { id: 'cb_5', name: 'Impermeabilização zona húmida', unit: 'm²', laborPrice: 35, materialPrice: 50 },
    { id: 'cb_6', name: 'Móvel casa de banho', unit: 'un', laborPrice: 80, materialPrice: 300 },
    { id: 'cb_7', name: 'Móvel + lavatório', unit: 'un', laborPrice: 60, materialPrice: 350 },
    { id: 'cb_8', name: 'Nicho embutido em parede', unit: 'un', laborPrice: 85, materialPrice: 25 },
    { id: 'cb_9', name: 'Ponto elétrico (tomada/interruptor/luz)', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'cb_10', name: 'Ralo linear de duche', unit: 'un', laborPrice: 60, materialPrice: 120 },
    { id: 'cb_11', name: 'Resguardo/box de duche', unit: 'un', laborPrice: 85, materialPrice: 300 },
    { id: 'cb_12', name: 'Revestimento cerâmico paredes', unit: 'm²', laborPrice: 35, materialPrice: 20 },
    { id: 'cb_13', name: 'Selagens em silicone', unit: 'un', laborPrice: 25, materialPrice: 10 },
    { id: 'cb_14', name: 'Spots embutidos teto', unit: 'un', laborPrice: 22, materialPrice: 18 },
    { id: 'cb_15', name: 'Torneiras', unit: 'un', laborPrice: 50, materialPrice: 220 },
  ],
  cozinha: [
    { id: 'coz_1', name: 'Armários', unit: 'm²', laborPrice: 60, materialPrice: 400 },
    { id: 'coz_2', name: 'Bancada', unit: 'ml', laborPrice: 70, materialPrice: 250 },
    { id: 'coz_3', name: 'Bancada quartzo/compacto/madeira', unit: 'ml', laborPrice: 80, materialPrice: 220 },
    { id: 'coz_4', name: 'Exaustor/hotte instalação', unit: 'un', laborPrice: 70, materialPrice: 180 },
    { id: 'coz_5', name: 'Forno encastrável', unit: 'un', laborPrice: 35, materialPrice: 400 },
    { id: 'coz_6', name: 'Instalação eletrodomésticos encastráveis', unit: 'un', laborPrice: 30, materialPrice: 0 },
    { id: 'coz_7', name: 'Lava-louça instalação', unit: 'un', laborPrice: 60, materialPrice: 180 },
    { id: 'coz_8', name: 'Ligação água/esgoto lava-louça/máquina', unit: 'lote', laborPrice: 25, materialPrice: 30 },
    { id: 'coz_9', name: 'Micro-ondas', unit: 'un', laborPrice: 30, materialPrice: 220 },
    { id: 'coz_10', name: 'Misturadora cozinha', unit: 'un', laborPrice: 30, materialPrice: 90 },
    { id: 'coz_11', name: 'Montagem módulos cozinha', unit: 'ml', laborPrice: 45, materialPrice: 10 },
    { id: 'coz_12', name: 'Placa de cozinha', unit: 'un', laborPrice: 55, materialPrice: 250 },
    { id: 'coz_13', name: 'Revestimento backsplash', unit: 'm²', laborPrice: 28, materialPrice: 45 },
    { id: 'coz_14', name: 'Selagem silicone bancada', unit: 'un', laborPrice: 12, materialPrice: 4 },
    { id: 'coz_15', name: 'Termoacumulador', unit: 'un', laborPrice: 120, materialPrice: 250 },
  ],
  demolicoes: [
    { id: 'dem_1', name: 'Abertura de roços para especialidades', unit: 'm²', laborPrice: 12, materialPrice: 3 },
    { id: 'dem_2', name: 'Carrinha de caixa aberta', unit: 'un', laborPrice: 140, materialPrice: 20 },
    { id: 'dem_3', name: 'Demolição de guarnições e molduras', unit: 'un', laborPrice: 8, materialPrice: 1 },
    { id: 'dem_4', name: 'Demolição móveis encastrados', unit: 'un', laborPrice: 45, materialPrice: 10 },
    { id: 'dem_5', name: 'Demolição parede alvenaria', unit: 'm²', laborPrice: 25, materialPrice: 8 },
    { id: 'dem_6', name: 'Demolição pavimento cerâmico', unit: 'm²', laborPrice: 18, materialPrice: 5 },
    { id: 'dem_7', name: 'Demolição rodapés cerâmicos/MDF', unit: 'ml', laborPrice: 6, materialPrice: 1 },
    { id: 'dem_8', name: 'Demolição teto falso', unit: 'lote', laborPrice: 16, materialPrice: 4 },
    { id: 'dem_9', name: 'Demolição teto falso + alvenaria', unit: 'm²', laborPrice: 22, materialPrice: 6 },
    { id: 'dem_10', name: 'Desmonte equipamentos sanitários', unit: 'vg', laborPrice: 35, materialPrice: 5 },
    { id: 'dem_11', name: 'Desmonte interruptores/luminárias', unit: 'un', laborPrice: 12, materialPrice: 2 },
    { id: 'dem_12', name: 'Picagem gesso paredes e tetos', unit: 'm²', laborPrice: 14, materialPrice: 3 },
  ],
  deslocacao_estaleiro: [
    { id: 'desl_1', name: 'Ajuda custo alimentação', unit: 'dia', laborPrice: 0, materialPrice: 20 },
    { id: 'desl_2', name: 'Aluguer andaimes', unit: 'm²/mês', laborPrice: 2, materialPrice: 6 },
    { id: 'desl_3', name: 'Contentor entulho 8–10 m³', unit: 'un', laborPrice: 40, materialPrice: 110 },
    { id: 'desl_4', name: 'Deslocação viatura obra', unit: 'km', laborPrice: 0.8, materialPrice: 0.2 },
    { id: 'desl_5', name: 'Estadia equipa deslocação', unit: 'noite', laborPrice: 15, materialPrice: 35 },
    { id: 'desl_6', name: 'Portagens e estacionamento', unit: 'viag', laborPrice: 0, materialPrice: 10 },
    { id: 'desl_7', name: 'Transporte de materiais', unit: 'viag', laborPrice: 35, materialPrice: 20 },
  ],
  eletrica: [
    { id: 'ele_1', name: 'Cabo 3x4 mm² (AC/forno)', unit: 'ml', laborPrice: 3, materialPrice: 4 },
    { id: 'ele_2', name: 'Cabo comando 2x1.5 mm²', unit: 'ml', laborPrice: 2, materialPrice: 0 },
    { id: 'ele_3', name: 'Cabo iluminação 3x1.5 mm²', unit: 'ml', laborPrice: 2.5, materialPrice: 1.5 },
    { id: 'ele_4', name: 'Cabo tomadas 3x2.5 mm²', unit: 'ml', laborPrice: 3, materialPrice: 2 },
    { id: 'ele_5', name: 'Caixa derivação 120x120', unit: 'un', laborPrice: 8, materialPrice: 5 },
    { id: 'ele_6', name: 'Calha técnica PVC 60x40 mm', unit: 'ml', laborPrice: 7, materialPrice: 9 },
    { id: 'ele_7', name: 'Candeeiro/aplique LED', unit: 'un', laborPrice: 25, materialPrice: 0 },
    { id: 'ele_8', name: 'Circuito dedicado (forno/AC)', unit: 'un', laborPrice: 70, materialPrice: 60 },
    { id: 'ele_9', name: 'Circuito dedicado 16A', unit: 'un', laborPrice: 90, materialPrice: 55 },
    { id: 'ele_10', name: 'Circuito dedicado 20A', unit: 'un', laborPrice: 95, materialPrice: 65 },
    { id: 'ele_11', name: 'Circuito trifásico', unit: 'un', laborPrice: 120, materialPrice: 90 },
    { id: 'ele_12', name: 'Disjuntor modular curva C', unit: 'un', laborPrice: 15, materialPrice: 12 },
    { id: 'ele_13', name: 'Disjuntor curva C 10A', unit: 'un', laborPrice: 0, materialPrice: 0 },
    { id: 'ele_14', name: 'Disjuntor curva C 32A', unit: 'un', laborPrice: 15, materialPrice: 16 },
    { id: 'ele_15', name: 'Disjuntor tetrapolar 40A', unit: 'un', laborPrice: 25, materialPrice: 40 },
    { id: 'ele_16', name: 'Tomadas/adaptadores especiais', unit: 'un', laborPrice: 8, materialPrice: 8 },
    { id: 'ele_17', name: 'Identificação quadro elétrico', unit: 'vg', laborPrice: 15, materialPrice: 5 },
  ],
  imprevistos_tpu: [
    { id: 'imp_1', name: 'Aluguer pontual equipamento', unit: 'dia', laborPrice: 0, materialPrice: 50 },
    { id: 'imp_2', name: 'Deslocação extra equipa', unit: 'un', laborPrice: 35, materialPrice: 5 },
    { id: 'imp_3', name: 'Materiais consumíveis diversos', unit: 'un', laborPrice: 0, materialPrice: 25 },
    { id: 'imp_4', name: 'Imprevistos instalações', unit: 'verba', laborPrice: 0, materialPrice: 0 },
    { id: 'imp_5', name: 'Imprevistos gerais obra', unit: 'verba', laborPrice: 0, materialPrice: 0 },
    { id: 'imp_6', name: 'Limpeza extra e remoção entulhos', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'imp_7', name: 'Mão de obra servente/ajudante', unit: 'h', laborPrice: 20, materialPrice: 0 },
    { id: 'imp_8', name: 'Trabalhos pontuais reparação', unit: 'un', laborPrice: 25, materialPrice: 10 },
  ],
  telhados: [
    { id: 'telhado_1', name: 'Beirais e fiadas de acabamento', unit: 'ml', laborPrice: 15, materialPrice: 10 },
    { id: 'telhado_2', name: 'Cobertura em telha (assentamento)', unit: 'm²', laborPrice: 20, materialPrice: 25 },
    { id: 'telhado_3', name: 'Cumeeira e remates (telha + cola)', unit: 'ml', laborPrice: 12, materialPrice: 18 },
    { id: 'telhado_4', name: 'Demolição de cobertura (retirada e carga)', unit: 'm²', laborPrice: 22.5, materialPrice: 5 },
    { id: 'telhado_5', name: 'Estrutura em madeira (asnas/caibros)*', unit: 'm²', laborPrice: 55, materialPrice: 65 },
    { id: 'telhado_6', name: 'Estrutura leve em aço (perfilado)*', unit: 'm²', laborPrice: 120, materialPrice: 80 },
    { id: 'telhado_7', name: 'Forro interior de Pladur *', unit: 'm²', laborPrice: 22, materialPrice: 18 },
    { id: 'telhado_8', name: 'Isolamento térmico (PIR/XPS 40–60 mm)', unit: 'm²', laborPrice: 10, materialPrice: 18 },
    { id: 'telhado_9', name: 'Meia-cana de drenagem em argamassa', unit: 'ml', laborPrice: 20, materialPrice: 8 },
    { id: 'telhado_10', name: 'Painel sandwich (cobertura completa)', unit: 'm²', laborPrice: 22, materialPrice: 35 },
    { id: 'telhado_11', name: 'Ripado e contraripado (madeira tratada)', unit: 'm²', laborPrice: 18, materialPrice: 12 },
    { id: 'telhado_12', name: 'Subtelha / membrana respirável', unit: 'm²', laborPrice: 8, materialPrice: 7 },
  ],
  pinturas: [
    { id: 'pint_1', name: 'Pintura interior paredes (tinta plástica)', unit: 'm²', laborPrice: 5, materialPrice: 3 },
    { id: 'pint_2', name: 'Pintura exterior fachada', unit: 'm²', laborPrice: 8, materialPrice: 5 },
    { id: 'pint_3', name: 'Pintura de tectos', unit: 'm²', laborPrice: 6, materialPrice: 3 },
    { id: 'pint_4', name: 'Verniz madeiras', unit: 'm²', laborPrice: 10, materialPrice: 6 },
    { id: 'pint_5', name: 'Impermeabilização com tinta', unit: 'm²', laborPrice: 7, materialPrice: 8 },
  ],
  pladur: [
    { id: 'plad_1', name: 'Parede em pladur simples', unit: 'm²', laborPrice: 18, materialPrice: 15 },
    { id: 'plad_2', name: 'Parede em pladur dupla', unit: 'm²', laborPrice: 25, materialPrice: 22 },
    { id: 'plad_3', name: 'Tecto falso em pladur', unit: 'm²', laborPrice: 22, materialPrice: 18 },
    { id: 'plad_4', name: 'Sanca em pladur', unit: 'ml', laborPrice: 20, materialPrice: 12 },
  ],
  impermeabilizacao: [
    { id: 'impermeab_1', name: 'Membrana betuminosa', unit: 'm²', laborPrice: 12, materialPrice: 10 },
    { id: 'impermeab_2', name: 'Tela líquida', unit: 'm²', laborPrice: 8, materialPrice: 12 },
  ],
  // ── ICF (Insulated Concrete Forms) ──
  icf_preparacao_terras: [
    { id: 'icf_pt_1', name: 'Limpeza de terreno', unit: 'm²', laborPrice: 2.5, materialPrice: 1.5 },
    { id: 'icf_pt_2', name: 'Escavação geral e regularização', unit: 'm²', laborPrice: 8, materialPrice: 5 },
    { id: 'icf_pt_3', name: 'Compactação de solo', unit: 'm²', laborPrice: 3, materialPrice: 2.5 },
    { id: 'icf_pt_4', name: 'Compactação (serviço completo)', unit: 'vg', laborPrice: 2000, materialPrice: 1500 },
    { id: 'icf_pt_5', name: 'Entivação', unit: 'm²', laborPrice: 10, materialPrice: 6 },
  ],
  icf_fundacoes_laje: [
    { id: 'icf_fl_1', name: 'Fundações em betão armado (por m² implantação)', unit: 'm²', laborPrice: 95, materialPrice: 100 },
    { id: 'icf_fl_2', name: 'Sapatas isoladas', unit: 'un', laborPrice: 120, materialPrice: 150 },
    { id: 'icf_fl_3', name: 'Vigas de fundação', unit: 'ml', laborPrice: 45, materialPrice: 55 },
    { id: 'icf_fl_4', name: 'Laje térrea em betão', unit: 'm²', laborPrice: 35, materialPrice: 40 },
    { id: 'icf_fl_5', name: 'Enrocamento e brita de regularização', unit: 'm³', laborPrice: 15, materialPrice: 25 },
  ],
  icf_paredes_estruturais: [
    { id: 'icf_pe_1', name: 'Blocos ICF standard 150 mm (forn. + montagem)', unit: 'm²', laborPrice: 35, materialPrice: 45 },
    { id: 'icf_pe_2', name: 'Blocos ICF standard 200 mm (forn. + montagem)', unit: 'm²', laborPrice: 38, materialPrice: 52 },
    { id: 'icf_pe_3', name: 'Blocos ICF standard 250 mm (forn. + montagem)', unit: 'm²', laborPrice: 40, materialPrice: 60 },
    { id: 'icf_pe_4', name: 'Blocos ICF curvo / angular', unit: 'm²', laborPrice: 50, materialPrice: 70 },
    { id: 'icf_pe_5', name: 'Armadura vertical ø12 (corte, dobragem, colocação)', unit: 'kg', laborPrice: 1.5, materialPrice: 1.2 },
    { id: 'icf_pe_6', name: 'Armadura horizontal ø10 (corte, dobragem, colocação)', unit: 'kg', laborPrice: 1.5, materialPrice: 1.1 },
    { id: 'icf_pe_7', name: 'Betão C25/30 enchimento ICF (bombagem incluída)', unit: 'm³', laborPrice: 25, materialPrice: 85 },
    { id: 'icf_pe_8', name: 'Escoramento / travamento provisório paredes ICF', unit: 'ml', laborPrice: 8, materialPrice: 6 },
    { id: 'icf_pe_9', name: 'Abertura e reforço de vãos em paredes ICF', unit: 'un', laborPrice: 45, materialPrice: 35 },
    { id: 'icf_pe_10', name: 'Lintel ICF para vãos (pré-fabricado)', unit: 'ml', laborPrice: 20, materialPrice: 30 },
    { id: 'icf_pe_11', name: 'Cinta / viga de coroamento ICF', unit: 'ml', laborPrice: 18, materialPrice: 25 },
    { id: 'icf_pe_12', name: 'Selagem de juntas entre blocos ICF', unit: 'ml', laborPrice: 3, materialPrice: 2 },
    { id: 'icf_pe_13', name: 'Parede ICF completa (por m² de parede)', unit: 'm²', laborPrice: 65, materialPrice: 105 },
  ],
  icf_lajes_cobertura: [
    { id: 'icf_lc_1', name: 'Laje aligeirada (vigotas + abobadilhas)', unit: 'm²', laborPrice: 30, materialPrice: 35 },
    { id: 'icf_lc_2', name: 'Laje maciça betão armado', unit: 'm²', laborPrice: 40, materialPrice: 50 },
    { id: 'icf_lc_3', name: 'Cofragem de laje', unit: 'm²', laborPrice: 15, materialPrice: 12 },
    { id: 'icf_lc_4', name: 'Betão C25/30 para laje', unit: 'm³', laborPrice: 25, materialPrice: 80 },
    { id: 'icf_lc_5', name: 'Armadura de laje (malhasol + reforços)', unit: 'kg', laborPrice: 1.5, materialPrice: 1.2 },
    { id: 'icf_lc_6', name: 'Estrutura laje/cobertura (por m² área bruta)', unit: 'm²', laborPrice: 110, materialPrice: 105 },
    { id: 'icf_lc_7', name: 'Cobertura inclinada com telha + isolamento', unit: 'm²', laborPrice: 50, materialPrice: 70 },
    { id: 'icf_lc_8', name: 'Painel sandwich', unit: 'm²', laborPrice: 22, materialPrice: 38 },
  ],
  icf_impermeabilizacao: [
    { id: 'icf_im_1', name: 'Membrana drenante ICF (enterrado)', unit: 'm²', laborPrice: 8, materialPrice: 6 },
    { id: 'icf_im_2', name: 'Impermeabilização betuminosa fundações', unit: 'm²', laborPrice: 10, materialPrice: 8 },
    { id: 'icf_im_3', name: 'Barreira pára-vapor', unit: 'm²', laborPrice: 5, materialPrice: 4 },
    { id: 'icf_im_4', name: 'Impermeabilização de cobertura plana', unit: 'm²', laborPrice: 15, materialPrice: 20 },
    { id: 'icf_im_5', name: 'Membrana betuminosa (geral)', unit: 'm²', laborPrice: 12, materialPrice: 10 },
  ],
  icf_instalacoes_aguas: [
    { id: 'icf_ia_1', name: 'Rede de águas e esgotos (por m² área bruta)', unit: 'm²', laborPrice: 30, materialPrice: 35 },
    { id: 'icf_ia_2', name: 'Ponto de água (por ponto)', unit: 'un', laborPrice: 90, materialPrice: 70 },
    { id: 'icf_ia_3', name: 'Ponto de esgoto (por ponto)', unit: 'un', laborPrice: 65, materialPrice: 35 },
    { id: 'icf_ia_4', name: 'Coluna de queda / ventilação', unit: 'ml', laborPrice: 30, materialPrice: 25 },
    { id: 'icf_ia_5', name: 'Caixa de visita', unit: 'un', laborPrice: 80, materialPrice: 60 },
    { id: 'icf_ia_6', name: 'Ligação à rede pública', unit: 'vg', laborPrice: 200, materialPrice: 150 },
    { id: 'icf_ia_7', name: 'Acréscimo rasgos em ICF (planeamento técnico)', unit: 'vg', laborPrice: 150, materialPrice: 50 },
  ],
  icf_instalacoes_eletricas: [
    { id: 'icf_ie_1', name: 'Instalação elétrica base (por m² área bruta)', unit: 'm²', laborPrice: 22, materialPrice: 30 },
    { id: 'icf_ie_2', name: 'Quadro elétrico completo', unit: 'un', laborPrice: 150, materialPrice: 250 },
    { id: 'icf_ie_3', name: 'Ponto de tomada', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'icf_ie_4', name: 'Ponto de iluminação', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'icf_ie_5', name: 'Circuito dedicado (forno/AC)', unit: 'un', laborPrice: 70, materialPrice: 60 },
    { id: 'icf_ie_6', name: 'Instalação de telecomunicações (ITED)', unit: 'vg', laborPrice: 200, materialPrice: 150 },
    { id: 'icf_ie_7', name: 'Acréscimo rasgos em ICF (planeamento técnico)', unit: 'vg', laborPrice: 150, materialPrice: 50 },
  ],
  icf_revestimento_interior: [
    { id: 'icf_ri_1', name: 'Estuque projectado sobre ICF', unit: 'm²', laborPrice: 12, materialPrice: 10 },
    { id: 'icf_ri_2', name: 'Gesso cartonado sobre ICF', unit: 'm²', laborPrice: 18, materialPrice: 14 },
    { id: 'icf_ri_3', name: 'Barramento e regularização', unit: 'm²', laborPrice: 8, materialPrice: 5 },
    { id: 'icf_ri_4', name: 'Revestimento cerâmico (paredes)', unit: 'm²', laborPrice: 24, materialPrice: 20 },
  ],
  icf_revestimento_exterior: [
    { id: 'icf_rx_1', name: 'Barramento armado + acabamento', unit: 'm²', laborPrice: 15, materialPrice: 22 },
    { id: 'icf_rx_2', name: 'Capoto / ETICS complementar', unit: 'm²', laborPrice: 22, materialPrice: 33 },
    { id: 'icf_rx_3', name: 'Reboco exterior', unit: 'm²', laborPrice: 18, materialPrice: 14 },
    { id: 'icf_rx_4', name: 'Pintura exterior sobre reboco', unit: 'm²', laborPrice: 8, materialPrice: 7 },
  ],
  icf_tetos_falsos: [
    { id: 'icf_tf_1', name: 'Teto falso em gesso cartonado', unit: 'm²', laborPrice: 22, materialPrice: 18 },
    { id: 'icf_tf_2', name: 'Teto falso com isolamento acústico', unit: 'm²', laborPrice: 28, materialPrice: 32 },
    { id: 'icf_tf_3', name: 'Divisória em pladur', unit: 'm²', laborPrice: 15, materialPrice: 10 },
    { id: 'icf_tf_4', name: 'Sanca em pladur', unit: 'ml', laborPrice: 20, materialPrice: 12 },
  ],
  icf_pavimentos: [
    { id: 'icf_pv_1', name: 'Aplicação de cerâmica (fornecimento + assentamento)', unit: 'm²', laborPrice: 24, materialPrice: 26 },
    { id: 'icf_pv_2', name: 'Pavimento flutuante / vinílico', unit: 'm²', laborPrice: 8, materialPrice: 22 },
    { id: 'icf_pv_3', name: 'Betonilha de regularização', unit: 'm²', laborPrice: 8, materialPrice: 6 },
    { id: 'icf_pv_4', name: 'Rodapé cerâmico', unit: 'ml', laborPrice: 5, materialPrice: 4 },
    { id: 'icf_pv_5', name: 'Soleira / peitoril em pedra', unit: 'ml', laborPrice: 15, materialPrice: 25 },
  ],
  icf_caixilharias: [
    { id: 'icf_cx_1', name: 'Janela PVC com vidro duplo', unit: 'm²', laborPrice: 40, materialPrice: 170 },
    { id: 'icf_cx_2', name: 'Janela alumínio com RPT', unit: 'm²', laborPrice: 45, materialPrice: 180 },
    { id: 'icf_cx_3', name: 'Porta de entrada exterior', unit: 'un', laborPrice: 120, materialPrice: 500 },
    { id: 'icf_cx_4', name: 'Janela standard (por unidade)', unit: 'un', laborPrice: 80, materialPrice: 220 },
    { id: 'icf_cx_5', name: 'Estores / portadas exteriores', unit: 'un', laborPrice: 40, materialPrice: 120 },
  ],
  icf_carpintarias: [
    { id: 'icf_ci_1', name: 'Porta interior com aro e guarnição', unit: 'un', laborPrice: 60, materialPrice: 125 },
    { id: 'icf_ci_2', name: 'Porta de correr embutida', unit: 'un', laborPrice: 140, materialPrice: 220 },
    { id: 'icf_ci_3', name: 'Roupeiro embutido (portas abrir)', unit: 'ml', laborPrice: 120, materialPrice: 250 },
    { id: 'icf_ci_4', name: 'Rodapés MDF lacado', unit: 'ml', laborPrice: 4, materialPrice: 3.5 },
    { id: 'icf_ci_5', name: 'Guarnições / aduelas', unit: 'un', laborPrice: 30, materialPrice: 35 },
  ],
  icf_pinturas: [
    { id: 'icf_pn_1', name: 'Pintura interior (paredes e tetos)', unit: 'm²', laborPrice: 5, materialPrice: 3 },
    { id: 'icf_pn_2', name: 'Pintura exterior (fachada)', unit: 'm²', laborPrice: 8, materialPrice: 7 },
    { id: 'icf_pn_3', name: 'Primário / selante', unit: 'm²', laborPrice: 3, materialPrice: 3 },
    { id: 'icf_pn_4', name: 'Verniz em madeiras', unit: 'm²', laborPrice: 10, materialPrice: 6 },
  ],
  icf_loucas_sanitarios: [
    { id: 'icf_ls_1', name: 'WC completo standard (louças + instalação)', unit: 'un', laborPrice: 800, materialPrice: 3500 },
    { id: 'icf_ls_2', name: 'Cozinha standard completa', unit: 'un', laborPrice: 2000, materialPrice: 6000 },
    { id: 'icf_ls_3', name: 'Sanita suspensa com autoclismo embutido', unit: 'un', laborPrice: 120, materialPrice: 350 },
    { id: 'icf_ls_4', name: 'Lavatório com móvel', unit: 'un', laborPrice: 60, materialPrice: 300 },
    { id: 'icf_ls_5', name: 'Base de duche + resguardo', unit: 'un', laborPrice: 120, materialPrice: 400 },
    { id: 'icf_ls_6', name: 'Torneiras misturadoras', unit: 'un', laborPrice: 50, materialPrice: 120 },
  ],
  icf_arranjos_exteriores: [
    { id: 'icf_ax_1', name: 'Pavimento exterior simples', unit: 'm²', laborPrice: 18, materialPrice: 25 },
    { id: 'icf_ax_2', name: 'Deck em madeira', unit: 'm²', laborPrice: 20, materialPrice: 30 },
    { id: 'icf_ax_3', name: 'Muros e vedações', unit: 'ml', laborPrice: 45, materialPrice: 55 },
    { id: 'icf_ax_4', name: 'Portão de garagem', unit: 'un', laborPrice: 200, materialPrice: 800 },
    { id: 'icf_ax_5', name: 'Piscina simples', unit: 'un', laborPrice: 3500, materialPrice: 6500 },
    { id: 'icf_ax_6', name: 'Calçada / lajetas exteriores', unit: 'm²', laborPrice: 15, materialPrice: 20 },
    { id: 'icf_ax_7', name: 'Rega automática', unit: 'vg', laborPrice: 300, materialPrice: 400 },
  ],
  // ── Construção Nova ──
  preparacao_terras: [
    { id: 'cn_pt_1', name: 'Limpeza de terreno', unit: 'm²', laborPrice: 2.5, materialPrice: 1.5 },
    { id: 'cn_pt_2', name: 'Escavação geral e regularização', unit: 'm²', laborPrice: 8, materialPrice: 5 },
    { id: 'cn_pt_3', name: 'Compactação de solo', unit: 'm²', laborPrice: 3, materialPrice: 2.5 },
    { id: 'cn_pt_4', name: 'Compactação (serviço completo)', unit: 'vg', laborPrice: 2000, materialPrice: 1500 },
    { id: 'cn_pt_5', name: 'Entivação', unit: 'm²', laborPrice: 10, materialPrice: 6 },
  ],
  fundacoes_laje: [
    { id: 'cn_fl_1', name: 'Fundações em betão armado (por m² implantação)', unit: 'm²', laborPrice: 90, materialPrice: 95 },
    { id: 'cn_fl_2', name: 'Sapatas isoladas', unit: 'un', laborPrice: 120, materialPrice: 150 },
    { id: 'cn_fl_3', name: 'Vigas de fundação', unit: 'ml', laborPrice: 45, materialPrice: 55 },
    { id: 'cn_fl_4', name: 'Laje térrea em betão', unit: 'm²', laborPrice: 35, materialPrice: 40 },
    { id: 'cn_fl_5', name: 'Enrocamento e brita de regularização', unit: 'm³', laborPrice: 15, materialPrice: 25 },
  ],
  estrutura_betao: [
    { id: 'cn_eb_1', name: 'Pilares em betão armado', unit: 'm³', laborPrice: 200, materialPrice: 180 },
    { id: 'cn_eb_2', name: 'Vigas em betão armado', unit: 'm³', laborPrice: 180, materialPrice: 170 },
    { id: 'cn_eb_3', name: 'Lajes maciças em betão armado', unit: 'm²', laborPrice: 40, materialPrice: 50 },
    { id: 'cn_eb_4', name: 'Lajes aligeiradas (vigotas + abobadilhas)', unit: 'm²', laborPrice: 30, materialPrice: 35 },
    { id: 'cn_eb_5', name: 'Estrutura betão armado (por m² área bruta)', unit: 'm²', laborPrice: 110, materialPrice: 105 },
    { id: 'cn_eb_6', name: 'Cofragem e descofragem', unit: 'm²', laborPrice: 15, materialPrice: 12 },
    { id: 'cn_eb_7', name: 'Armadura em aço (corte, dobragem, colocação)', unit: 'kg', laborPrice: 1.5, materialPrice: 1.2 },
    { id: 'cn_eb_8', name: 'Betão C25/30 (fornecimento e bombagem)', unit: 'm³', laborPrice: 25, materialPrice: 85 },
  ],
  paredes_exteriores: [
    { id: 'cn_pe_1', name: 'Parede em bloco térmico', unit: 'm²', laborPrice: 25, materialPrice: 32 },
    { id: 'cn_pe_2', name: 'Parede em tijolo cerâmico (pano exterior)', unit: 'm²', laborPrice: 22, materialPrice: 25 },
    { id: 'cn_pe_3', name: 'Parede dupla com caixa de ar', unit: 'm²', laborPrice: 35, materialPrice: 35 },
  ],
  paredes_interiores: [
    { id: 'cn_pi_1', name: 'Divisória em tijolo cerâmico', unit: 'm²', laborPrice: 20, materialPrice: 17 },
    { id: 'cn_pi_2', name: 'Divisória em bloco de betão', unit: 'm²', laborPrice: 22, materialPrice: 25 },
    { id: 'cn_pi_3', name: 'Divisória em pladur (simples)', unit: 'm²', laborPrice: 18, materialPrice: 15 },
  ],
  coberturas_telhados: [
    { id: 'cn_ct_1', name: 'Cobertura inclinada simples', unit: 'm²', laborPrice: 40, materialPrice: 55 },
    { id: 'cn_ct_2', name: 'Painel sandwich', unit: 'm²', laborPrice: 22, materialPrice: 38 },
    { id: 'cn_ct_3', name: 'Cobertura com telha + isolamento', unit: 'm²', laborPrice: 50, materialPrice: 70 },
    { id: 'cn_ct_4', name: 'Estrutura em madeira (asnas/caibros)', unit: 'm²', laborPrice: 55, materialPrice: 65 },
    { id: 'cn_ct_5', name: 'Ripado e contraripado', unit: 'm²', laborPrice: 18, materialPrice: 12 },
    { id: 'cn_ct_6', name: 'Subtelha / membrana respirável', unit: 'm²', laborPrice: 8, materialPrice: 7 },
  ],
  impermeabilizacao_isolamento: [
    { id: 'cn_ii_1', name: 'Capoto / ETICS', unit: 'm²', laborPrice: 22, materialPrice: 33 },
    { id: 'cn_ii_2', name: 'Impermeabilização de cobertura plana', unit: 'm²', laborPrice: 15, materialPrice: 20 },
    { id: 'cn_ii_3', name: 'Membrana betuminosa', unit: 'm²', laborPrice: 12, materialPrice: 10 },
    { id: 'cn_ii_4', name: 'Tela líquida impermeabilizante', unit: 'm²', laborPrice: 8, materialPrice: 12 },
    { id: 'cn_ii_5', name: 'Isolamento térmico XPS/EPS (paredes)', unit: 'm²', laborPrice: 8, materialPrice: 12 },
  ],
  instalacoes_aguas: [
    { id: 'cn_ia_1', name: 'Rede de águas e esgotos (por m² área bruta)', unit: 'm²', laborPrice: 30, materialPrice: 35 },
    { id: 'cn_ia_2', name: 'Ponto de água (por ponto)', unit: 'un', laborPrice: 90, materialPrice: 70 },
    { id: 'cn_ia_3', name: 'Ponto de esgoto (por ponto)', unit: 'un', laborPrice: 65, materialPrice: 35 },
    { id: 'cn_ia_4', name: 'Coluna de queda / ventilação', unit: 'ml', laborPrice: 30, materialPrice: 25 },
    { id: 'cn_ia_5', name: 'Caixa de visita', unit: 'un', laborPrice: 80, materialPrice: 60 },
    { id: 'cn_ia_6', name: 'Ligação à rede pública', unit: 'vg', laborPrice: 200, materialPrice: 150 },
  ],
  instalacoes_eletricas: [
    { id: 'cn_ie_1', name: 'Instalação elétrica base (por m² área bruta)', unit: 'm²', laborPrice: 22, materialPrice: 30 },
    { id: 'cn_ie_2', name: 'Quadro elétrico completo', unit: 'un', laborPrice: 150, materialPrice: 250 },
    { id: 'cn_ie_3', name: 'Ponto de tomada', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'cn_ie_4', name: 'Ponto de iluminação', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'cn_ie_5', name: 'Circuito dedicado (forno/AC)', unit: 'un', laborPrice: 70, materialPrice: 60 },
    { id: 'cn_ie_6', name: 'Instalação de telecomunicações (ITED)', unit: 'vg', laborPrice: 200, materialPrice: 150 },
  ],
  rebocos_estuques: [
    { id: 'cn_re_1', name: 'Reboco interior (paredes)', unit: 'm²', laborPrice: 12, materialPrice: 10 },
    { id: 'cn_re_2', name: 'Reboco exterior (fachada)', unit: 'm²', laborPrice: 18, materialPrice: 14 },
    { id: 'cn_re_3', name: 'Estuque projectado', unit: 'm²', laborPrice: 10, materialPrice: 8 },
    { id: 'cn_re_4', name: 'Barramento e regularização de superfícies', unit: 'm²', laborPrice: 8, materialPrice: 5 },
  ],
  tetos_falsos_pladur: [
    { id: 'cn_tf_1', name: 'Teto falso em gesso cartonado', unit: 'm²', laborPrice: 22, materialPrice: 18 },
    { id: 'cn_tf_2', name: 'Teto falso com isolamento acústico', unit: 'm²', laborPrice: 28, materialPrice: 32 },
    { id: 'cn_tf_3', name: 'Divisória em pladur', unit: 'm²', laborPrice: 15, materialPrice: 10 },
    { id: 'cn_tf_4', name: 'Sanca em pladur', unit: 'ml', laborPrice: 20, materialPrice: 12 },
    { id: 'cn_tf_5', name: 'Tabica / negativo iluminação', unit: 'ml', laborPrice: 18, materialPrice: 10 },
  ],
  pavimentos_revestimentos: [
    { id: 'cn_pr_1', name: 'Aplicação de cerâmica (fornecimento + assentamento)', unit: 'm²', laborPrice: 24, materialPrice: 26 },
    { id: 'cn_pr_2', name: 'Pavimento flutuante / vinílico', unit: 'm²', laborPrice: 8, materialPrice: 22 },
    { id: 'cn_pr_3', name: 'Betonilha de regularização', unit: 'm²', laborPrice: 8, materialPrice: 6 },
    { id: 'cn_pr_4', name: 'Rodapé cerâmico', unit: 'ml', laborPrice: 5, materialPrice: 4 },
    { id: 'cn_pr_5', name: 'Soleira / peitoril em pedra', unit: 'ml', laborPrice: 15, materialPrice: 25 },
  ],
  caixilharias_exteriores: [
    { id: 'cn_cx_1', name: 'Janela PVC com vidro duplo', unit: 'm²', laborPrice: 40, materialPrice: 170 },
    { id: 'cn_cx_2', name: 'Janela alumínio com RPT', unit: 'm²', laborPrice: 45, materialPrice: 180 },
    { id: 'cn_cx_3', name: 'Porta de entrada exterior', unit: 'un', laborPrice: 120, materialPrice: 500 },
    { id: 'cn_cx_4', name: 'Janela standard (por unidade)', unit: 'un', laborPrice: 80, materialPrice: 220 },
    { id: 'cn_cx_5', name: 'Estores / portadas exteriores', unit: 'un', laborPrice: 40, materialPrice: 120 },
  ],
  carpintarias_interiores: [
    { id: 'cn_ci_1', name: 'Porta interior com aro e guarnição', unit: 'un', laborPrice: 60, materialPrice: 125 },
    { id: 'cn_ci_2', name: 'Porta de correr embutida', unit: 'un', laborPrice: 140, materialPrice: 220 },
    { id: 'cn_ci_3', name: 'Roupeiro embutido (portas abrir)', unit: 'ml', laborPrice: 120, materialPrice: 250 },
    { id: 'cn_ci_4', name: 'Rodapés MDF lacado', unit: 'ml', laborPrice: 4, materialPrice: 3.5 },
    { id: 'cn_ci_5', name: 'Guarnições / aduelas', unit: 'un', laborPrice: 30, materialPrice: 35 },
  ],
  pinturas_cn: [
    { id: 'cn_pn_1', name: 'Pintura interior (paredes e tetos)', unit: 'm²', laborPrice: 5, materialPrice: 3 },
    { id: 'cn_pn_2', name: 'Pintura exterior (fachada)', unit: 'm²', laborPrice: 8, materialPrice: 7 },
    { id: 'cn_pn_3', name: 'Primário / selante', unit: 'm²', laborPrice: 3, materialPrice: 3 },
    { id: 'cn_pn_4', name: 'Verniz em madeiras', unit: 'm²', laborPrice: 10, materialPrice: 6 },
  ],
  loucas_sanitarios: [
    { id: 'cn_ls_1', name: 'WC completo standard (louças + instalação)', unit: 'un', laborPrice: 800, materialPrice: 3500 },
    { id: 'cn_ls_2', name: 'Cozinha standard completa', unit: 'un', laborPrice: 2000, materialPrice: 6000 },
    { id: 'cn_ls_3', name: 'Sanita suspensa com autoclismo embutido', unit: 'un', laborPrice: 120, materialPrice: 350 },
    { id: 'cn_ls_4', name: 'Lavatório com móvel', unit: 'un', laborPrice: 60, materialPrice: 300 },
    { id: 'cn_ls_5', name: 'Base de duche + resguardo', unit: 'un', laborPrice: 120, materialPrice: 400 },
    { id: 'cn_ls_6', name: 'Banheira', unit: 'un', laborPrice: 150, materialPrice: 500 },
    { id: 'cn_ls_7', name: 'Torneiras misturadoras', unit: 'un', laborPrice: 50, materialPrice: 120 },
  ],
  arranjos_exteriores: [
    { id: 'cn_ax_1', name: 'Pavimento exterior simples', unit: 'm²', laborPrice: 18, materialPrice: 25 },
    { id: 'cn_ax_2', name: 'Deck em madeira', unit: 'm²', laborPrice: 20, materialPrice: 30 },
    { id: 'cn_ax_3', name: 'Muros e vedações', unit: 'ml', laborPrice: 45, materialPrice: 55 },
    { id: 'cn_ax_4', name: 'Portão de garagem', unit: 'un', laborPrice: 200, materialPrice: 800 },
    { id: 'cn_ax_5', name: 'Piscina simples', unit: 'un', laborPrice: 3500, materialPrice: 6500 },
    { id: 'cn_ax_6', name: 'Calçada / lajetas exteriores', unit: 'm²', laborPrice: 15, materialPrice: 20 },
    { id: 'cn_ax_7', name: 'Rega automática', unit: 'vg', laborPrice: 300, materialPrice: 400 },
  ],
  // ── LSF (Light Steel Frame) ──
  lsf_preparacao_terras: [
    { id: 'lsf_pt_1', name: 'Limpeza de terreno', unit: 'm²', laborPrice: 2.5, materialPrice: 1.5 },
    { id: 'lsf_pt_2', name: 'Escavação geral e regularização', unit: 'm²', laborPrice: 8, materialPrice: 5 },
    { id: 'lsf_pt_3', name: 'Compactação de solo', unit: 'm²', laborPrice: 3, materialPrice: 2.5 },
    { id: 'lsf_pt_4', name: 'Compactação (serviço completo)', unit: 'vg', laborPrice: 2000, materialPrice: 1500 },
    { id: 'lsf_pt_5', name: 'Entivação', unit: 'm²', laborPrice: 10, materialPrice: 6 },
  ],
  lsf_fundacao_laje: [
    { id: 'lsf_fl_1', name: 'Fundação / laje base LSF (por m² implantação)', unit: 'm²', laborPrice: 75, materialPrice: 90 },
    { id: 'lsf_fl_2', name: 'Sapatas isoladas', unit: 'un', laborPrice: 100, materialPrice: 130 },
    { id: 'lsf_fl_3', name: 'Vigas de fundação', unit: 'ml', laborPrice: 40, materialPrice: 50 },
    { id: 'lsf_fl_4', name: 'Laje térrea em betão', unit: 'm²', laborPrice: 30, materialPrice: 35 },
    { id: 'lsf_fl_5', name: 'Enrocamento e brita de regularização', unit: 'm³', laborPrice: 15, materialPrice: 25 },
  ],
  lsf_estrutura: [
    { id: 'lsf_es_1', name: 'Estrutura LSF - perfis + montagem (standard)', unit: 'm²', laborPrice: 180, materialPrice: 220 },
    { id: 'lsf_es_2', name: 'Estrutura LSF - envelope completo', unit: 'm²', laborPrice: 220, materialPrice: 280 },
    { id: 'lsf_es_3', name: 'Reforços estruturais e cantoneiras', unit: 'ml', laborPrice: 12, materialPrice: 18 },
    { id: 'lsf_es_4', name: 'Laje de piso em LSF (steel deck)', unit: 'm²', laborPrice: 50, materialPrice: 65 },
  ],
  lsf_fecho_exterior: [
    { id: 'lsf_fe_1', name: 'OSB + membrana impermeável', unit: 'm²', laborPrice: 18, materialPrice: 22 },
    { id: 'lsf_fe_2', name: 'Isolamento em lã mineral (fecho)', unit: 'm²', laborPrice: 10, materialPrice: 18 },
    { id: 'lsf_fe_3', name: 'Placa exterior cimentícia', unit: 'm²', laborPrice: 20, materialPrice: 28 },
    { id: 'lsf_fe_4', name: 'Fecho exterior completo (OSB + membrana + isolamento + placa)', unit: 'm²', laborPrice: 50, materialPrice: 85 },
    { id: 'lsf_fe_5', name: 'Barreira pára-vapor interior', unit: 'm²', laborPrice: 5, materialPrice: 4 },
  ],
  lsf_divisorias: [
    { id: 'lsf_di_1', name: 'Divisória em gesso cartonado simples', unit: 'm²', laborPrice: 15, materialPrice: 12 },
    { id: 'lsf_di_2', name: 'Divisória em gesso cartonado dupla', unit: 'm²', laborPrice: 22, materialPrice: 20 },
    { id: 'lsf_di_3', name: 'Divisória com isolamento acústico', unit: 'm²', laborPrice: 25, materialPrice: 30 },
    { id: 'lsf_di_4', name: 'Reforço para fixação de móveis', unit: 'ml', laborPrice: 8, materialPrice: 6 },
  ],
  lsf_cobertura: [
    { id: 'lsf_co_1', name: 'Cobertura LSF completa (estrutura + placa + impermeabilização)', unit: 'm²', laborPrice: 45, materialPrice: 60 },
    { id: 'lsf_co_2', name: 'Painel sandwich (cobertura)', unit: 'm²', laborPrice: 22, materialPrice: 38 },
    { id: 'lsf_co_3', name: 'Cobertura inclinada com telha', unit: 'm²', laborPrice: 50, materialPrice: 70 },
    { id: 'lsf_co_4', name: 'Impermeabilização de cobertura', unit: 'm²', laborPrice: 15, materialPrice: 18 },
    { id: 'lsf_co_5', name: 'Subtelha / membrana respirável', unit: 'm²', laborPrice: 8, materialPrice: 7 },
  ],
  lsf_isolamentos: [
    { id: 'lsf_is_1', name: 'Lã mineral (paredes)', unit: 'm²', laborPrice: 8, materialPrice: 14 },
    { id: 'lsf_is_2', name: 'EPS / XPS (isolamento adicional)', unit: 'm²', laborPrice: 8, materialPrice: 12 },
    { id: 'lsf_is_3', name: 'Isolamento acústico (composição)', unit: 'm²', laborPrice: 12, materialPrice: 22 },
    { id: 'lsf_is_4', name: 'Isolamento térmico cobertura', unit: 'm²', laborPrice: 10, materialPrice: 18 },
    { id: 'lsf_is_5', name: 'Barreira pára-vapor', unit: 'm²', laborPrice: 5, materialPrice: 4 },
  ],
  lsf_fachada: [
    { id: 'lsf_fa_1', name: 'Capoto / ETICS', unit: 'm²', laborPrice: 22, materialPrice: 33 },
    { id: 'lsf_fa_2', name: 'Fachada ventilada', unit: 'm²', laborPrice: 50, materialPrice: 70 },
    { id: 'lsf_fa_3', name: 'Painel cimentício exterior', unit: 'm²', laborPrice: 25, materialPrice: 35 },
    { id: 'lsf_fa_4', name: 'Revestimento exterior em madeira', unit: 'm²', laborPrice: 30, materialPrice: 40 },
  ],
  lsf_instalacoes_aguas: [
    { id: 'lsf_ia_1', name: 'Rede de águas e esgotos (por m² área bruta)', unit: 'm²', laborPrice: 30, materialPrice: 35 },
    { id: 'lsf_ia_2', name: 'Ponto de água (por ponto)', unit: 'un', laborPrice: 90, materialPrice: 70 },
    { id: 'lsf_ia_3', name: 'Ponto de esgoto (por ponto)', unit: 'un', laborPrice: 65, materialPrice: 35 },
    { id: 'lsf_ia_4', name: 'Coluna de queda / ventilação', unit: 'ml', laborPrice: 30, materialPrice: 25 },
    { id: 'lsf_ia_5', name: 'Caixa de visita', unit: 'un', laborPrice: 80, materialPrice: 60 },
    { id: 'lsf_ia_6', name: 'Ligação à rede pública', unit: 'vg', laborPrice: 200, materialPrice: 150 },
  ],
  lsf_instalacoes_eletricas: [
    { id: 'lsf_ie_1', name: 'Instalação elétrica base (por m² área bruta)', unit: 'm²', laborPrice: 22, materialPrice: 30 },
    { id: 'lsf_ie_2', name: 'Quadro elétrico completo', unit: 'un', laborPrice: 150, materialPrice: 250 },
    { id: 'lsf_ie_3', name: 'Ponto de tomada', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'lsf_ie_4', name: 'Ponto de iluminação', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'lsf_ie_5', name: 'Circuito dedicado (forno/AC)', unit: 'un', laborPrice: 70, materialPrice: 60 },
    { id: 'lsf_ie_6', name: 'Instalação de telecomunicações (ITED)', unit: 'vg', laborPrice: 200, materialPrice: 150 },
  ],
  lsf_rebocos_estuques: [
    { id: 'lsf_re_1', name: 'Reboco interior (paredes)', unit: 'm²', laborPrice: 12, materialPrice: 10 },
    { id: 'lsf_re_2', name: 'Reboco exterior (fachada)', unit: 'm²', laborPrice: 18, materialPrice: 14 },
    { id: 'lsf_re_3', name: 'Estuque projectado', unit: 'm²', laborPrice: 10, materialPrice: 8 },
    { id: 'lsf_re_4', name: 'Barramento e regularização de superfícies', unit: 'm²', laborPrice: 8, materialPrice: 5 },
  ],
  lsf_tetos_falsos: [
    { id: 'lsf_tf_1', name: 'Teto falso em gesso cartonado', unit: 'm²', laborPrice: 22, materialPrice: 18 },
    { id: 'lsf_tf_2', name: 'Teto falso com isolamento acústico', unit: 'm²', laborPrice: 28, materialPrice: 32 },
    { id: 'lsf_tf_3', name: 'Divisória em pladur', unit: 'm²', laborPrice: 15, materialPrice: 10 },
    { id: 'lsf_tf_4', name: 'Sanca em pladur', unit: 'ml', laborPrice: 20, materialPrice: 12 },
    { id: 'lsf_tf_5', name: 'Tabica / negativo iluminação', unit: 'ml', laborPrice: 18, materialPrice: 10 },
  ],
  lsf_pavimentos: [
    { id: 'lsf_pv_1', name: 'Aplicação de cerâmica (fornecimento + assentamento)', unit: 'm²', laborPrice: 24, materialPrice: 26 },
    { id: 'lsf_pv_2', name: 'Pavimento flutuante / vinílico', unit: 'm²', laborPrice: 8, materialPrice: 22 },
    { id: 'lsf_pv_3', name: 'Betonilha de regularização', unit: 'm²', laborPrice: 8, materialPrice: 6 },
    { id: 'lsf_pv_4', name: 'Rodapé cerâmico', unit: 'ml', laborPrice: 5, materialPrice: 4 },
    { id: 'lsf_pv_5', name: 'Soleira / peitoril em pedra', unit: 'ml', laborPrice: 15, materialPrice: 25 },
  ],
  lsf_caixilharias: [
    { id: 'lsf_cx_1', name: 'Janela PVC com vidro duplo', unit: 'm²', laborPrice: 40, materialPrice: 170 },
    { id: 'lsf_cx_2', name: 'Janela alumínio com RPT', unit: 'm²', laborPrice: 45, materialPrice: 180 },
    { id: 'lsf_cx_3', name: 'Porta de entrada exterior', unit: 'un', laborPrice: 120, materialPrice: 500 },
    { id: 'lsf_cx_4', name: 'Janela standard (por unidade)', unit: 'un', laborPrice: 80, materialPrice: 220 },
    { id: 'lsf_cx_5', name: 'Estores / portadas exteriores', unit: 'un', laborPrice: 40, materialPrice: 120 },
  ],
  lsf_carpintarias: [
    { id: 'lsf_ci_1', name: 'Porta interior com aro e guarnição', unit: 'un', laborPrice: 60, materialPrice: 125 },
    { id: 'lsf_ci_2', name: 'Porta de correr embutida', unit: 'un', laborPrice: 140, materialPrice: 220 },
    { id: 'lsf_ci_3', name: 'Roupeiro embutido (portas abrir)', unit: 'ml', laborPrice: 120, materialPrice: 250 },
    { id: 'lsf_ci_4', name: 'Rodapés MDF lacado', unit: 'ml', laborPrice: 4, materialPrice: 3.5 },
    { id: 'lsf_ci_5', name: 'Guarnições / aduelas', unit: 'un', laborPrice: 30, materialPrice: 35 },
  ],
  lsf_pinturas: [
    { id: 'lsf_pn_1', name: 'Pintura interior (paredes e tetos)', unit: 'm²', laborPrice: 5, materialPrice: 3 },
    { id: 'lsf_pn_2', name: 'Pintura exterior (fachada)', unit: 'm²', laborPrice: 8, materialPrice: 7 },
    { id: 'lsf_pn_3', name: 'Primário / selante', unit: 'm²', laborPrice: 3, materialPrice: 3 },
    { id: 'lsf_pn_4', name: 'Verniz em madeiras', unit: 'm²', laborPrice: 10, materialPrice: 6 },
  ],
  lsf_loucas_sanitarios: [
    { id: 'lsf_ls_1', name: 'WC completo standard (louças + instalação)', unit: 'un', laborPrice: 800, materialPrice: 3500 },
    { id: 'lsf_ls_2', name: 'Cozinha standard completa', unit: 'un', laborPrice: 2000, materialPrice: 6000 },
    { id: 'lsf_ls_3', name: 'Sanita suspensa com autoclismo embutido', unit: 'un', laborPrice: 120, materialPrice: 350 },
    { id: 'lsf_ls_4', name: 'Lavatório com móvel', unit: 'un', laborPrice: 60, materialPrice: 300 },
    { id: 'lsf_ls_5', name: 'Base de duche + resguardo', unit: 'un', laborPrice: 120, materialPrice: 400 },
    { id: 'lsf_ls_6', name: 'Torneiras misturadoras', unit: 'un', laborPrice: 50, materialPrice: 120 },
  ],
  lsf_arranjos_exteriores: [
    { id: 'lsf_ax_1', name: 'Pavimento exterior simples', unit: 'm²', laborPrice: 18, materialPrice: 25 },
    { id: 'lsf_ax_2', name: 'Deck em madeira', unit: 'm²', laborPrice: 20, materialPrice: 30 },
    { id: 'lsf_ax_3', name: 'Muros e vedações', unit: 'ml', laborPrice: 45, materialPrice: 55 },
    { id: 'lsf_ax_4', name: 'Portão de garagem', unit: 'un', laborPrice: 200, materialPrice: 800 },
    { id: 'lsf_ax_5', name: 'Piscina simples', unit: 'un', laborPrice: 3500, materialPrice: 6500 },
    { id: 'lsf_ax_6', name: 'Calçada / lajetas exteriores', unit: 'm²', laborPrice: 15, materialPrice: 20 },
    { id: 'lsf_ax_7', name: 'Rega automática', unit: 'vg', laborPrice: 300, materialPrice: 400 },
  ],
};

export interface BudgetItem {
  id: string;
  areaKey: string;
  name: string;
  unit: string;
  quantity: number;
  laborUnitPrice: number;
  materialTotalPrice: number;
  isCustom?: boolean;
  /** Nome da Zona (opcional). Ex.: "Cozinha". */
  zoneName?: string;
  /** Nome da Área (opcional, exige zoneName). */
  areaName?: string;
  /** Nome do Tipo de Serviço (opcional). Ex.: "Pavimentos". */
  serviceTypeName?: string;
  /** Zona de Intervenção / Tipologia (ex.: "Apartamento 01", "Moradia"). */
  propertyTypeName?: string;
  /** Código do artigo na Base (quando proveniente da Base de Preços). */
  baseCode?: string;
  /** Tipo da base de origem ("geral" | "remodelacao"). */
  baseTipo?: 'geral' | 'remodelacao';
  /** Capítulo na Base (para upsert correto quando guardado). */
  baseCapitulo?: string;
  /** Componentes adicionais de custo €/un (opcional, paridade c/ Avançado). */
  subUnitPrice?: number;
  srvUnitPrice?: number;
  aluUnitPrice?: number;
  divUnitPrice?: number;
  /** Margem do artigo (%). Se ausente, usa a do orçamento. */
  marginPct?: number;
  /** Contexto de intervenção (interior / exterior / geral). */
  interventionContext?: 'interior' | 'exterior' | 'geral';
  /** Código manual editável (espelha o do Avançado). */
  code?: string;
  /** Notas livres. */
  notes?: string;
}

// --- Áreas de Intervenção pré-definidas (residencial PT) ---
export type InterventionContext = 'interior' | 'exterior' | 'geral';

export interface ZoneOption {
  key: string;
  label: string;
  /** Contexto da área: interior, exterior ou geral (aplicável a ambos). */
  context?: InterventionContext;
}

export const CONTEXT_OPTIONS: { value: InterventionContext; label: string }[] = [
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'geral', label: 'Geral' },
];

export const ZONAS_PREDEFINIDAS: ZoneOption[] = [
  { key: 'cozinha', label: 'Cozinha', context: 'interior' },
  { key: 'sala', label: 'Sala', context: 'interior' },
  { key: 'sala_jantar', label: 'Sala de Jantar', context: 'interior' },
  { key: 'quarto', label: 'Quarto', context: 'interior' },
  { key: 'suite', label: 'Suite', context: 'interior' },
  { key: 'casa_banho', label: 'Casa de Banho', context: 'interior' },
  { key: 'wc_servico', label: 'WC Serviço', context: 'interior' },
  { key: 'hall', label: 'Hall', context: 'interior' },
  { key: 'corredor', label: 'Corredor', context: 'interior' },
  { key: 'escritorio', label: 'Escritório', context: 'interior' },
  { key: 'lavandaria', label: 'Lavandaria', context: 'interior' },
  { key: 'despensa', label: 'Despensa', context: 'interior' },
  { key: 'garagem', label: 'Garagem', context: 'interior' },
  { key: 'cave', label: 'Cave', context: 'interior' },
  { key: 'sotao', label: 'Sótão', context: 'interior' },
  { key: 'varanda_terraco', label: 'Varanda/Terraço', context: 'exterior' },
  { key: 'exterior', label: 'Exterior', context: 'exterior' },
  { key: 'jardim', label: 'Jardim', context: 'exterior' },
  { key: 'comum', label: 'Comum/Geral', context: 'geral' },
];

/**
 * Tipos de Serviço sugeridos por zona — mapeiam para areaKeys do catálogo
 * (AREAS_REMODELACAO) que alimenta os itens. Se a zona não estiver mapeada
 * ou o tipo de obra não for Remodelação, mostra-se a lista completa.
 */
export const SERVICOS_POR_ZONA: Record<string, string[]> = {
  cozinha: ['demolicoes', 'aguas_esgotos', 'eletrica', 'pavimentos_rodapes', 'tectos_sancas', 'carpintaria', 'pinturas', 'cozinha'],
  sala: ['pavimentos_rodapes', 'pinturas', 'tectos_sancas', 'eletrica', 'ar_condicionados'],
  sala_jantar: ['pavimentos_rodapes', 'pinturas', 'tectos_sancas', 'eletrica', 'ar_condicionados'],
  quarto: ['pavimentos_rodapes', 'pinturas', 'tectos_sancas', 'eletrica', 'carpintaria'],
  suite: ['pavimentos_rodapes', 'pinturas', 'tectos_sancas', 'eletrica', 'carpintaria', 'casa_banho', 'aguas_esgotos'],
  casa_banho: ['demolicoes', 'aguas_esgotos', 'impermeabilizacao', 'eletrica', 'pavimentos_rodapes', 'tectos_sancas', 'pinturas', 'casa_banho'],
  wc_servico: ['demolicoes', 'aguas_esgotos', 'impermeabilizacao', 'eletrica', 'pavimentos_rodapes', 'pinturas', 'casa_banho'],
  hall: ['pavimentos_rodapes', 'pinturas', 'tectos_sancas', 'eletrica'],
  corredor: ['pavimentos_rodapes', 'pinturas', 'tectos_sancas', 'eletrica'],
  escritorio: ['pavimentos_rodapes', 'pinturas', 'tectos_sancas', 'eletrica', 'carpintaria'],
  lavandaria: ['aguas_esgotos', 'eletrica', 'pavimentos_rodapes', 'pinturas'],
  despensa: ['pavimentos_rodapes', 'pinturas', 'eletrica', 'carpintaria'],
  garagem: ['pavimentos_rodapes', 'pinturas', 'eletrica', 'impermeabilizacao', 'serralharia_caixilharia'],
  cave: ['pavimentos_rodapes', 'pinturas', 'eletrica', 'impermeabilizacao'],
  sotao: ['pavimentos_rodapes', 'pinturas', 'eletrica', 'impermeabilizacao', 'telhados'],
  varanda_terraco: ['impermeabilizacao', 'pavimentos_rodapes', 'serralharia_caixilharia', 'pinturas'],
  exterior: ['capoto', 'pinturas', 'serralharia_caixilharia', 'impermeabilizacao'],
  jardim: ['jardim', 'piscinas', 'aguas_esgotos', 'eletrica'],
  comum: ['deslocacao_estaleiro', 'demolicoes_recolha', 'imprevistos_tpu'],
};

export type ExportGrouping = 'chapter' | 'chapter_zone' | 'chapter_zone_area';

export interface BudgetClientInfo {
  budgetNumber: string;
  clientName: string;
  workLocation: string;
  conditions: string;
  date: string;
  validUntil: string;
  expectedStart: string;
}

export type SummaryColumn =
  | 'area'
  | 'item'
  | 'unit'
  | 'qty'
  | 'laborUnit'
  | 'materialTotal'
  | 'totalLabor'
  | 'totalMaterial'
  | 'subtotal';

export const SUMMARY_COLUMNS: { key: SummaryColumn; label: string }[] = [
  { key: 'area', label: 'Tipo de Serviço' },
  { key: 'item', label: 'Item' },
  { key: 'unit', label: 'Unidade' },
  { key: 'qty', label: 'Qtd' },
  { key: 'laborUnit', label: 'M.O. €/un' },
  { key: 'materialTotal', label: 'Mat. €/total' },
  { key: 'totalLabor', label: 'Tot. M.O.' },
  { key: 'totalMaterial', label: 'Tot. Mat.' },
  { key: 'subtotal', label: 'Subtotal' },
];

export const DEFAULT_VISIBLE_COLUMNS: SummaryColumn[] = ['area', 'item', 'unit', 'qty', 'subtotal'];

export function formatEUR(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

export function computeItemTotals(item: BudgetItem) {
  const extraUnit =
    (item.subUnitPrice || 0) +
    (item.srvUnitPrice || 0) +
    (item.aluUnitPrice || 0) +
    (item.divUnitPrice || 0);
  const totalLabor = item.laborUnitPrice * item.quantity;
  const totalMaterial = (item.materialTotalPrice + extraUnit) * item.quantity;
  const subtotal = totalLabor + totalMaterial;
  return { totalLabor, totalMaterial, subtotal };
}

export interface IvaBreakdown {
  laborBase: number;
  laborRate: number;
  laborValue: number;
  materialBase: number;
  materialRate: number;
  materialValue: number;
}

