// Types for the redesigned Orçamento Essencial page

export type BudgetType = 'remodelacao' | 'construcao_nova' | 'lsf';

export interface BudgetTypeOption {
  value: BudgetType;
  label: string;
  subtitle: string;
}

export const BUDGET_TYPES: BudgetTypeOption[] = [
  { value: 'remodelacao', label: 'Remodelação', subtitle: 'Obras de remodelação / reabilitação' },
  { value: 'construcao_nova', label: 'Construção Nova', subtitle: 'Construção de raiz / obra nova' },
  { value: 'lsf', label: 'LSF', subtitle: 'Light Steel Frame' },
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
  { key: 'estruturas_verticais', label: '3 - Estruturas verticais' },
  { key: 'alvenarias', label: '4 - Alvenarias' },
  { key: 'coberturas_telhados', label: '5 - Coberturas e telhados' },
  { key: 'caixilharias_serralharias', label: '6 - Caixilharias e serralharias' },
  { key: 'instalacoes_aguas', label: '7 - Instalações de águas' },
  { key: 'instalacoes_eletricas', label: '8 - Instalações elétricas' },
  { key: 'revestimentos_interiores', label: '9 - Revestimentos interiores' },
  { key: 'revestimentos_exteriores', label: '10 - Revestimentos exteriores' },
  { key: 'arranjos_exteriores', label: '11 - Arranjos exteriores' },
  { key: 'lsf_cap', label: 'LSF' },
];

export const AREAS_LSF: AreaConfig[] = [
  ...AREAS_CONSTRUCAO_NOVA,
  { key: 'estrutura_lsf', label: 'Estrutura LSF' },
  { key: 'paineis_osb', label: 'Painéis OSB' },
  { key: 'isolamento_termico', label: 'Isolamento Térmico' },
];

export function getAreasForType(type: BudgetType): AreaConfig[] {
  switch (type) {
    case 'remodelacao': return AREAS_REMODELACAO;
    case 'construcao_nova': return AREAS_CONSTRUCAO_NOVA;
    case 'lsf': return AREAS_LSF;
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
  eletrica: [
    { id: 'ele_1', name: 'Ponto de luz simples', unit: 'un', laborPrice: 25, materialPrice: 15 },
    { id: 'ele_2', name: 'Tomada simples 16A', unit: 'un', laborPrice: 20, materialPrice: 12 },
    { id: 'ele_3', name: 'Quadro elétrico parcial', unit: 'un', laborPrice: 150, materialPrice: 200 },
    { id: 'ele_4', name: 'Ponto de luz duplo/triplo', unit: 'un', laborPrice: 35, materialPrice: 25 },
  ],
  demolicoes: [
    { id: 'dem_1', name: 'Demolição de parede em alvenaria', unit: 'm²', laborPrice: 15, materialPrice: 2 },
    { id: 'dem_2', name: 'Demolição de pavimento cerâmico', unit: 'm²', laborPrice: 12, materialPrice: 1 },
    { id: 'dem_3', name: 'Remoção de revestimento parede', unit: 'm²', laborPrice: 8, materialPrice: 1 },
    { id: 'dem_4', name: 'Carga e transporte de entulho', unit: 'm³', laborPrice: 20, materialPrice: 30 },
  ],
  casa_banho: [
    { id: 'cb_1', name: 'Revestimento cerâmico paredes', unit: 'm²', laborPrice: 20, materialPrice: 25 },
    { id: 'cb_2', name: 'Revestimento cerâmico pavimento', unit: 'm²', laborPrice: 18, materialPrice: 22 },
    { id: 'cb_3', name: 'Instalação de sanita', unit: 'un', laborPrice: 60, materialPrice: 150 },
    { id: 'cb_4', name: 'Instalação de lavatório', unit: 'un', laborPrice: 50, materialPrice: 120 },
    { id: 'cb_5', name: 'Base de duche + resguardo', unit: 'un', laborPrice: 80, materialPrice: 250 },
  ],
  cozinha: [
    { id: 'coz_1', name: 'Revestimento cerâmico/porcelanato', unit: 'm²', laborPrice: 20, materialPrice: 30 },
    { id: 'coz_2', name: 'Bancada em pedra/silestone', unit: 'ml', laborPrice: 40, materialPrice: 180 },
    { id: 'coz_3', name: 'Ponto de água (fria/quente)', unit: 'un', laborPrice: 35, materialPrice: 20 },
  ],
  pladur: [
    { id: 'plad_1', name: 'Parede em pladur simples', unit: 'm²', laborPrice: 18, materialPrice: 15 },
    { id: 'plad_2', name: 'Parede em pladur dupla', unit: 'm²', laborPrice: 25, materialPrice: 22 },
    { id: 'plad_3', name: 'Tecto falso em pladur', unit: 'm²', laborPrice: 22, materialPrice: 18 },
    { id: 'plad_4', name: 'Sanca em pladur', unit: 'ml', laborPrice: 20, materialPrice: 12 },
  ],
  impermeabilizacao: [
    { id: 'imp_1', name: 'Membrana betuminosa', unit: 'm²', laborPrice: 12, materialPrice: 10 },
    { id: 'imp_2', name: 'Tela líquida', unit: 'm²', laborPrice: 8, materialPrice: 12 },
  ],
  carpintaria: [
    { id: 'carp_1', name: 'Porta interior em madeira', unit: 'un', laborPrice: 50, materialPrice: 120 },
    { id: 'carp_2', name: 'Rodapé em madeira/MDF', unit: 'ml', laborPrice: 6, materialPrice: 5 },
    { id: 'carp_3', name: 'Roupeiro embutido', unit: 'ml', laborPrice: 80, materialPrice: 200 },
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
}

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
  { key: 'area', label: 'Área' },
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
  const totalLabor = item.laborUnitPrice * item.quantity;
  const totalMaterial = item.materialTotalPrice * item.quantity;
  const subtotal = totalLabor + totalMaterial;
  return { totalLabor, totalMaterial, subtotal };
}
