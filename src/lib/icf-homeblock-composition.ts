import type {
  ICFBlockLibraryItem,
  ICFOpening,
  ICFWallCompositionResult,
  ICFCutSuggestion,
  ICFAccessoryEstimate,
} from '@/types/icf-homeblock';

export interface ComputeInput {
  wall_panel_id: string;
  length_m: number;
  height_m: number;
  openings?: ICFOpening[];
  block: ICFBlockLibraryItem;
  accessory_topo?: ICFBlockLibraryItem | null;
  accessory_espacador?: ICFBlockLibraryItem | null;
  losses_factor?: number; // default 0.05
}

export function calculateOpeningsAreaM2(openings: ICFOpening[] = []): number {
  return openings.reduce((sum, o) => sum + (Number(o.width_m) || 0) * (Number(o.height_m) || 0), 0);
}

export function calculateICFWallComposition(input: ComputeInput): ICFWallCompositionResult {
  const { wall_panel_id, length_m, height_m, openings = [], block } = input;
  const losses = input.losses_factor ?? 0.05;

  const wallLengthMm = length_m * 1000;
  const wallHeightMm = height_m * 1000;
  const blockLen = Number(block.length_mm) || 0;
  const blockH = Number(block.height_mm) || 0;

  const grossArea = length_m * height_m;
  const openingsArea = calculateOpeningsAreaM2(openings);
  const netArea = Math.max(grossArea - openingsArea, 0);

  const warnings: string[] = [];
  const cutSuggestions: ICFCutSuggestion[] = [];

  if (!blockLen || !blockH) {
    warnings.push('Bloco selecionado sem dimensões válidas - composição não pôde ser calculada.');
    return {
      wall_panel_id,
      block_code: block.code,
      rows: 0,
      blocks_per_row: 0,
      base_block_qty: 0,
      remaining_length_mm: 0,
      remaining_height_mm: 0,
      openings_area_m2: round(openingsArea, 3),
      estimated_removed_blocks_by_openings: 0,
      estimated_final_block_qty: 0,
      gross_area_m2: round(grossArea, 3),
      net_area_m2: round(netArea, 3),
      cut_suggestions: cutSuggestions,
      accessories: [],
      warnings,
      losses_factor: losses,
    };
  }

  const fullRows = Math.floor(wallHeightMm / blockH);
  const remainingHeightMm = wallHeightMm - fullRows * blockH;
  const blocksPerRow = Math.floor(wallLengthMm / blockLen);
  const remainingLengthMm = wallLengthMm - blocksPerRow * blockLen;
  const baseBlockQty = blocksPerRow * fullRows;

  if (remainingLengthMm > 0.5) {
    cutSuggestions.push({
      type: 'horizontal',
      description: `Sobra horizontal de ${Math.round(remainingLengthMm)} mm na fiada - sugerir bloco cortado ou redistribuição da modulação.`,
      value_mm: Math.round(remainingLengthMm),
      review_required: true,
    });
    warnings.push(
      `Sobra horizontal de ${Math.round(remainingLengthMm)} mm identificada. Validar corte ou redistribuição de modulação.`,
    );
  }

  if (remainingHeightMm > 0.5) {
    cutSuggestions.push({
      type: 'vertical',
      description: `Remate superior necessário (${Math.round(remainingHeightMm)} mm de altura restante).`,
      value_mm: Math.round(remainingHeightMm),
      review_required: true,
    });
    warnings.push(
      'Altura da parede não fecha exatamente com a altura do bloco. Validar remate superior.',
    );
  }

  // Desconto de aberturas por área equivalente
  const blockArea = blockLen * blockH; // mm²
  const openingsAreaMm2 = openingsArea * 1_000_000;
  const estimatedRemovedBlocksByOpenings =
    openingsArea > 0 ? Math.ceil(openingsAreaMm2 / blockArea) : 0;

  if (openingsArea > 0) {
    cutSuggestions.push({
      type: 'opening_adjustment',
      description: `${openings.length} abertura(s) - desconto estimado por área equivalente (${estimatedRemovedBlocksByOpenings} blocos).`,
      review_required: true,
    });
    warnings.push(
      'O desconto de blocos por abertura é estimado por área equivalente e deve ser validado na modulação executiva.',
    );
  }

  const baseAfterOpenings = Math.max(baseBlockQty - estimatedRemovedBlocksByOpenings, 0);
  const finalQty = Math.ceil(baseAfterOpenings * (1 + losses));

  // Acessórios (estimativa heurística)
  const accessories: ICFAccessoryEstimate[] = [];

  if (input.accessory_topo && input.accessory_topo.length_mm) {
    const topoLen = Number(input.accessory_topo.length_mm);
    const topoQty = Math.ceil(wallLengthMm / topoLen);
    accessories.push({
      code: input.accessory_topo.code,
      name: input.accessory_topo.name,
      estimated_qty: topoQty,
      unit: 'un',
    });
  }

  if (input.accessory_espacador) {
    // Heurística: 1 espaçador a cada 2 fiadas, por bloco
    const espQty = Math.ceil((baseBlockQty || blocksPerRow) * Math.max(1, Math.ceil(fullRows / 2)) / 2);
    accessories.push({
      code: input.accessory_espacador.code,
      name: input.accessory_espacador.name,
      estimated_qty: espQty,
      unit: 'un',
    });
  }

  return {
    wall_panel_id,
    block_code: block.code,
    rows: fullRows,
    blocks_per_row: blocksPerRow,
    base_block_qty: baseBlockQty,
    remaining_length_mm: Math.round(remainingLengthMm),
    remaining_height_mm: Math.round(remainingHeightMm),
    openings_area_m2: round(openingsArea, 3),
    estimated_removed_blocks_by_openings: estimatedRemovedBlocksByOpenings,
    estimated_final_block_qty: finalQty,
    gross_area_m2: round(grossArea, 3),
    net_area_m2: round(netArea, 3),
    cut_suggestions: cutSuggestions,
    accessories,
    warnings,
    losses_factor: losses,
  };
}

function round(n: number, d: number) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
