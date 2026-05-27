import { describe, it, expect } from 'vitest';
import { suggestFoundationItems, FOUNDATION_OPTIONS } from './icf-foundation-suggestions';

describe('icf foundation suggestions', () => {
  it('produz nada quando opção é "nenhuma"', () => {
    const out = suggestFoundationItems({ option: 'nenhuma', params: {} });
    expect(out).toEqual([]);
  });

  it('todos os itens vêm marcados como sugeridos pela Axia com revisão obrigatória', () => {
    const out = suggestFoundationItems({
      option: 'sapata_continua',
      baseIcfWallLength: 40,
      params: { largura: 0.6, altura: 0.4, perdas_pct: 5, incluir_aco: true, incluir_escavacao: true, incluir_betao_limpeza: true },
    });
    expect(out.length).toBeGreaterThan(0);
    out.forEach((i) => {
      expect(i.source_type).toBe('sugerido_axia');
      expect(i.review_required).toBe(true);
      expect(i.user_confirmed).toBe(false);
      expect(i.assumptions.length).toBeGreaterThan(0);
    });
  });

  it('sapata contínua usa o comprimento de base das paredes ICF', () => {
    const out = suggestFoundationItems({
      option: 'sapata_continua',
      baseIcfWallLength: 50,
      params: { largura: 0.6, altura: 0.4, perdas_pct: 0, incluir_aco: false, incluir_escavacao: false, incluir_betao_limpeza: false },
    });
    const sapata = out.find((i) => i.unit === 'ml');
    expect(sapata?.quantity).toBe(50);
    const betao = out.find((i) => i.reference?.startsWith('Betão sapata'));
    expect(betao?.quantity).toBe(50 * 0.6 * 0.4);
  });

  it('definição das 6 opções está completa', () => {
    expect(FOUNDATION_OPTIONS).toHaveLength(6);
  });
});
