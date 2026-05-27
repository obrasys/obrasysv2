import { describe, it, expect } from 'vitest';
import { calculateICFWallComposition, calculateOpeningsAreaM2 } from './icf-homeblock-composition';
import type { ICFBlockLibraryItem } from '@/types/icf-homeblock';

const block220: ICFBlockLibraryItem = {
  id: 'b1',
  empresa_id: null,
  code: 'HB-BLOCO-220',
  name: 'HOMEBLOCK Bloco 22 cm',
  category: 'bloco_principal',
  length_mm: 900,
  height_mm: 270,
  thickness_mm: 220,
  module_mm: 75,
  drawing_file: null,
  can_be_cut: true,
  use_case: null,
  notes: null,
  system_seed: true,
  created_at: '',
  updated_at: '',
};

describe('calculateICFWallComposition', () => {
  it('calcula fiadas e blocos por fiada', () => {
    const r = calculateICFWallComposition({
      wall_panel_id: 'p1',
      length_m: 9.0,
      height_m: 2.7,
      block: block220,
    });
    expect(r.rows).toBe(10);
    expect(r.blocks_per_row).toBe(10);
    expect(r.base_block_qty).toBe(100);
    expect(r.remaining_length_mm).toBe(0);
    expect(r.remaining_height_mm).toBe(0);
    expect(r.warnings).toHaveLength(0);
  });

  it('sinaliza sobra horizontal e altura restante', () => {
    const r = calculateICFWallComposition({
      wall_panel_id: 'p2',
      length_m: 5.0,
      height_m: 2.8,
      block: block220,
    });
    expect(r.blocks_per_row).toBe(5);
    expect(r.remaining_length_mm).toBe(500);
    expect(r.rows).toBe(10);
    expect(r.remaining_height_mm).toBe(100);
    expect(r.cut_suggestions.some(c => c.type === 'horizontal')).toBe(true);
    expect(r.cut_suggestions.some(c => c.type === 'vertical')).toBe(true);
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('desconta aberturas por área equivalente e gera warning', () => {
    const r = calculateICFWallComposition({
      wall_panel_id: 'p3',
      length_m: 9.0,
      height_m: 2.7,
      block: block220,
      openings: [{ type: 'janela', width_m: 1.2, height_m: 1.0 }],
    });
    expect(r.openings_area_m2).toBeCloseTo(1.2);
    expect(r.estimated_removed_blocks_by_openings).toBeGreaterThan(0);
    expect(r.warnings.some(w => w.includes('área equivalente'))).toBe(true);
  });

  it('calcula área bruta e líquida', () => {
    const r = calculateICFWallComposition({
      wall_panel_id: 'p4',
      length_m: 4.0,
      height_m: 2.5,
      block: block220,
      openings: [{ type: 'porta', width_m: 0.9, height_m: 2.1 }],
    });
    expect(r.gross_area_m2).toBeCloseTo(10);
    expect(r.net_area_m2).toBeCloseTo(10 - 1.89);
  });

  it('soma área de várias aberturas', () => {
    expect(
      calculateOpeningsAreaM2([
        { type: 'janela', width_m: 1, height_m: 1 },
        { type: 'porta', width_m: 0.9, height_m: 2.1 },
      ]),
    ).toBeCloseTo(2.89);
  });
});
