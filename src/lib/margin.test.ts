import { describe, it, expect } from 'vitest';
import { calcPrecoVenda, calcLucro, calcMargemReal, aplicarMargem } from './margin';

describe('calcPrecoVenda', () => {
  it('custo 100 / margem 30% → 142.86', () => {
    expect(calcPrecoVenda(100, 30)).toBe(142.86);
  });

  it('custo 250 / margem 20% → 312.50', () => {
    expect(calcPrecoVenda(250, 20)).toBe(312.5);
  });

  it('custo 80 / margem 50% → 160.00', () => {
    expect(calcPrecoVenda(80, 50)).toBe(160);
  });

  it('margem 0% → preço = custo', () => {
    expect(calcPrecoVenda(100, 0)).toBe(100);
  });

  it('margem 100% → erro', () => {
    expect(() => calcPrecoVenda(100, 100)).toThrow('Margem deve ser inferior a 100%');
  });

  it('margem negativa → erro', () => {
    expect(() => calcPrecoVenda(100, -5)).toThrow('Margem não pode ser negativa');
  });

  it('custo 0 → preço 0', () => {
    expect(calcPrecoVenda(0, 30)).toBe(0);
  });
});

describe('calcLucro', () => {
  it('custo 100 / margem 30% → lucro 42.86', () => {
    expect(calcLucro(100, 30)).toBe(42.86);
  });

  it('margem 0% → lucro 0', () => {
    expect(calcLucro(100, 0)).toBe(0);
  });
});

describe('calcMargemReal', () => {
  it('custo 100 / preço 142.86 → ~30%', () => {
    expect(calcMargemReal(100, 142.86)).toBeCloseTo(30, 0);
  });

  it('custo = preço → 0%', () => {
    expect(calcMargemReal(100, 100)).toBe(0);
  });

  it('preço 0 → 0%', () => {
    expect(calcMargemReal(100, 0)).toBe(0);
  });
});

describe('aplicarMargem', () => {
  it('applies margin correctly to subtotal', () => {
    expect(aplicarMargem(1000, 25)).toBe(1333.33);
  });
});
