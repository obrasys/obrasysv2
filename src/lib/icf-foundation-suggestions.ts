import type { FoundationOptionKey, IcfAssistantItem } from '@/types/icf-assistant';

export interface FoundationOptionDef {
  key: FoundationOptionKey;
  label: string;
  description: string;
  whenToUse: string;
  fields: FoundationField[];
}

export interface FoundationField {
  name: string;
  label: string;
  unit?: string;
  type: 'number' | 'boolean' | 'text';
  defaultValue?: number | boolean | string;
}

export const FOUNDATION_OPTIONS: FoundationOptionDef[] = [
  {
    key: 'sapata_continua',
    label: 'Sapata contínua sob paredes ICF',
    description: 'Sapata corrida em betão armado executada ao longo das paredes ICF de fachada e empenas.',
    whenToUse: 'Terrenos com boa capacidade portante e edifícios térreos ou de 2 pisos.',
    fields: [
      { name: 'largura', label: 'Largura da sapata', unit: 'm', type: 'number', defaultValue: 0.6 },
      { name: 'altura', label: 'Altura da sapata', unit: 'm', type: 'number', defaultValue: 0.4 },
      { name: 'perdas_pct', label: 'Perdas', unit: '%', type: 'number', defaultValue: 5 },
      { name: 'incluir_aco', label: 'Incluir aço', type: 'boolean', defaultValue: true },
      { name: 'incluir_escavacao', label: 'Incluir escavação', type: 'boolean', defaultValue: true },
      { name: 'incluir_betao_limpeza', label: 'Incluir betão de limpeza', type: 'boolean', defaultValue: true },
    ],
  },
  {
    key: 'laje_terrea_bordo',
    label: 'Laje térrea com bordo espessado',
    description: 'Laje térrea contínua com fundação periférica espessada que recebe as paredes ICF.',
    whenToUse: 'Construção rápida em terrenos planos e estáveis.',
    fields: [
      { name: 'area', label: 'Área da laje', unit: 'm²', type: 'number', defaultValue: 0 },
      { name: 'espessura', label: 'Espessura da laje', unit: 'm', type: 'number', defaultValue: 0.15 },
      { name: 'largura_bordo', label: 'Largura do bordo', unit: 'm', type: 'number', defaultValue: 0.4 },
      { name: 'altura_bordo', label: 'Altura do bordo', unit: 'm', type: 'number', defaultValue: 0.5 },
      { name: 'perimetro', label: 'Perímetro exterior', unit: 'm', type: 'number', defaultValue: 0 },
      { name: 'incluir_isolamento', label: 'Incluir isolamento', type: 'boolean', defaultValue: true },
      { name: 'incluir_malha', label: 'Incluir malha/aço', type: 'boolean', defaultValue: true },
      { name: 'perdas_pct', label: 'Perdas', unit: '%', type: 'number', defaultValue: 5 },
    ],
  },
  {
    key: 'stem_wall',
    label: 'Stem wall / parede de fundação ICF',
    description: 'Parede de fundação em ICF sobre sapata corrida, criando caixa de ar ou crawlspace.',
    whenToUse: 'Terrenos em desnível ou quando se pretende ventilar o piso térreo.',
    fields: [
      { name: 'comprimento', label: 'Comprimento', unit: 'm', type: 'number', defaultValue: 0 },
      { name: 'altura', label: 'Altura da parede', unit: 'm', type: 'number', defaultValue: 1.2 },
      { name: 'nucleo', label: 'Espessura núcleo ICF', unit: 'm', type: 'number', defaultValue: 0.20 },
      { name: 'incluir_sapata', label: 'Sapata associada', type: 'boolean', defaultValue: true },
      { name: 'incluir_impermeabilizacao', label: 'Impermeabilização', type: 'boolean', defaultValue: true },
      { name: 'incluir_drenagem', label: 'Drenagem', type: 'boolean', defaultValue: true },
      { name: 'incluir_isolamento', label: 'Isolamento', type: 'boolean', defaultValue: true },
      { name: 'perdas_pct', label: 'Perdas', unit: '%', type: 'number', defaultValue: 5 },
    ],
  },
  {
    key: 'cave_basement',
    label: 'Cave / basement em ICF',
    description: 'Paredes enterradas em ICF formando cave habitável ou técnica.',
    whenToUse: 'Quando há espaço útil enterrado ou desnível acentuado.',
    fields: [
      { name: 'perimetro', label: 'Perímetro enterrado', unit: 'm', type: 'number', defaultValue: 0 },
      { name: 'altura', label: 'Altura enterrada', unit: 'm', type: 'number', defaultValue: 2.5 },
      { name: 'nucleo', label: 'Espessura núcleo', unit: 'm', type: 'number', defaultValue: 0.25 },
      { name: 'area_aberturas', label: 'Área aberturas', unit: 'm²', type: 'number', defaultValue: 0 },
      { name: 'incluir_impermeabilizacao', label: 'Impermeabilização', type: 'boolean', defaultValue: true },
      { name: 'incluir_drenagem', label: 'Drenagem', type: 'boolean', defaultValue: true },
      { name: 'perdas_pct', label: 'Perdas', unit: '%', type: 'number', defaultValue: 5 },
    ],
  },
  {
    key: 'radier',
    label: 'Radier / laje de fundação',
    description: 'Laje contínua de fundação que distribui a carga em toda a área do edifício.',
    whenToUse: 'Terrenos de baixa capacidade portante ou cargas elevadas.',
    fields: [
      { name: 'area', label: 'Área', unit: 'm²', type: 'number', defaultValue: 0 },
      { name: 'espessura', label: 'Espessura', unit: 'm', type: 'number', defaultValue: 0.25 },
      { name: 'incluir_vigas', label: 'Vigas/engrossamentos', type: 'boolean', defaultValue: false },
      { name: 'incluir_aco', label: 'Incluir aço', type: 'boolean', defaultValue: true },
      { name: 'incluir_isolamento', label: 'Incluir isolamento', type: 'boolean', defaultValue: true },
      { name: 'perdas_pct', label: 'Perdas', unit: '%', type: 'number', defaultValue: 5 },
    ],
  },
  {
    key: 'nenhuma',
    label: 'Não incluir fundações',
    description: 'O orçamento ICF é gerado apenas para a estrutura acima do solo; fundações tratadas em separado.',
    whenToUse: 'Quando outro fornecedor/projeto trata da fundação.',
    fields: [],
  },
];

export interface FoundationSuggestionInput {
  option: FoundationOptionKey;
  params: Record<string, number | boolean>;
  /** Comprimento total das paredes ICF candidatas (m) - usado quando o campo perimetro/comprimento não é fornecido. */
  baseIcfWallLength?: number;
}

export type SuggestedItem = Omit<
  IcfAssistantItem,
  'id' | 'session_id' | 'organization_id' | 'created_at' | 'updated_at'
>;

/**
 * Gera itens preliminares de fundação. TODOS marcados como sugeridos pela Axia e com revisão obrigatória.
 */
export function suggestFoundationItems(input: FoundationSuggestionInput): SuggestedItem[] {
  const { option, params, baseIcfWallLength = 0 } = input;
  const p = (name: string, fallback = 0) =>
    typeof params[name] === 'number' ? (params[name] as number) : fallback;
  const f = (name: string) => params[name] === true;
  const perdas = (p('perdas_pct', 5) / 100);
  const out: SuggestedItem[] = [];

  const push = (item: Partial<SuggestedItem> & Pick<SuggestedItem, 'reference' | 'quantity' | 'unit'>) => {
    out.push({
      category: 'fundacao',
      is_icf_candidate: false,
      user_confirmed: false,
      attributes: item.attributes ?? { option, params },
      source_type: 'sugerido_axia',
      review_required: true,
      confidence: item.confidence ?? 0.55,
      assumptions: item.assumptions ?? [
        'Planta arquitetónica não contém fundações',
        'Quantitativo preliminar baseado nas paredes ICF selecionadas',
        'Dimensões definidas por parâmetro do utilizador',
      ],
      notes: item.notes ?? null,
      ordem: out.length,
      reference: item.reference,
      quantity: item.quantity,
      unit: item.unit,
    });
  };

  switch (option) {
    case 'sapata_continua': {
      const comp = baseIcfWallLength;
      const largura = p('largura', 0.6);
      const altura = p('altura', 0.4);
      const volume = comp * largura * altura * (1 + perdas);
      push({ reference: 'Sapata contínua sob paredes ICF', quantity: round(comp), unit: 'ml' });
      push({ reference: 'Betão sapata contínua', quantity: round(volume), unit: 'm³' });
      if (f('incluir_aco')) push({ reference: 'Aço sapata contínua (estimativa 80 kg/m³)', quantity: round(volume * 80), unit: 'kg' });
      if (f('incluir_escavacao')) push({ reference: 'Escavação para sapata contínua', quantity: round(comp * largura * (altura + 0.1)), unit: 'm³' });
      if (f('incluir_betao_limpeza')) push({ reference: 'Betão de limpeza', quantity: round(comp * largura * 0.05), unit: 'm³' });
      break;
    }
    case 'laje_terrea_bordo': {
      const area = p('area');
      const esp = p('espessura', 0.15);
      const perim = p('perimetro', baseIcfWallLength);
      const lb = p('largura_bordo', 0.4);
      const hb = p('altura_bordo', 0.5);
      const volLaje = area * esp * (1 + perdas);
      const volBordo = perim * lb * hb * (1 + perdas);
      push({ reference: 'Laje térrea betão', quantity: round(volLaje), unit: 'm³' });
      push({ reference: 'Bordo espessado betão', quantity: round(volBordo), unit: 'm³' });
      if (f('incluir_malha')) push({ reference: 'Malha electrosoldada laje (estimativa 4 kg/m²)', quantity: round(area * 4), unit: 'kg' });
      if (f('incluir_isolamento')) push({ reference: 'Isolamento sob laje', quantity: round(area), unit: 'm²' });
      break;
    }
    case 'stem_wall': {
      const comp = p('comprimento', baseIcfWallLength);
      const altura = p('altura', 1.2);
      const nucleo = p('nucleo', 0.20);
      const vol = comp * altura * nucleo * (1 + perdas);
      push({ reference: 'Parede ICF de fundação (stem wall)', quantity: round(comp * altura), unit: 'm²' });
      push({ reference: 'Betão parede ICF de fundação', quantity: round(vol), unit: 'm³' });
      if (f('incluir_sapata')) push({ reference: 'Sapata corrida sob stem wall', quantity: round(comp), unit: 'ml' });
      if (f('incluir_impermeabilizacao')) push({ reference: 'Impermeabilização parede enterrada', quantity: round(comp * altura), unit: 'm²' });
      if (f('incluir_drenagem')) push({ reference: 'Tubo dreno perimetral', quantity: round(comp), unit: 'ml' });
      if (f('incluir_isolamento')) push({ reference: 'Isolamento exterior parede enterrada', quantity: round(comp * altura), unit: 'm²' });
      break;
    }
    case 'cave_basement': {
      const perim = p('perimetro', baseIcfWallLength);
      const altura = p('altura', 2.5);
      const nucleo = p('nucleo', 0.25);
      const aberturas = p('area_aberturas');
      const areaParede = Math.max(0, perim * altura - aberturas);
      const vol = areaParede * nucleo * (1 + perdas);
      push({ reference: 'Paredes ICF de cave', quantity: round(areaParede), unit: 'm²' });
      push({ reference: 'Betão paredes de cave', quantity: round(vol), unit: 'm³' });
      push({ reference: 'Aço paredes de cave (estimativa 90 kg/m³)', quantity: round(vol * 90), unit: 'kg' });
      if (f('incluir_impermeabilizacao')) push({ reference: 'Impermeabilização cave', quantity: round(areaParede), unit: 'm²' });
      if (f('incluir_drenagem')) push({ reference: 'Drenagem perimetral cave', quantity: round(perim), unit: 'ml' });
      break;
    }
    case 'radier': {
      const area = p('area');
      const esp = p('espessura', 0.25);
      const vol = area * esp * (1 + perdas);
      push({ reference: 'Radier - laje de fundação', quantity: round(area), unit: 'm²' });
      push({ reference: 'Betão radier', quantity: round(vol), unit: 'm³' });
      if (f('incluir_aco')) push({ reference: 'Aço radier (estimativa 100 kg/m³)', quantity: round(vol * 100), unit: 'kg' });
      if (f('incluir_isolamento')) push({ reference: 'Isolamento sob radier', quantity: round(area), unit: 'm²' });
      if (f('incluir_vigas')) push({ reference: 'Vigas/engrossamentos radier', quantity: round(area * 0.1), unit: 'm³' });
      break;
    }
    case 'nenhuma':
      // sem itens
      break;
  }

  return out;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
