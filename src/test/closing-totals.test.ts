/**
 * Regression tests for `computeClosingTotals` in `src/types/closing-sheet.ts`.
 *
 * Folha de Fecho é o motor de RAI (Resultado Antes de Impostos) da plataforma.
 * Estes testes blindam as fórmulas que alimentam a Administração e impedem
 * que refactors silenciosos desloquem custo industrial, IVA ou RAI.
 *
 * Cobertura:
 *   - Soma de Custos Diretos com desconto por capítulo + linha extra + estimativa por m².
 *   - Custo Industrial = Diretos + Estaleiro.
 *   - Base IVA Construção exclui mão-de-obra de estaleiro.
 *   - RAI €, RAI %, k_venda e custo/m² derivados de Valor de Vendas.
 *   - Cenário "tudo a zero" devolve totais coerentes (zero, sem divisões por zero).
 */
import { describe, it, expect } from "vitest";
import {
  computeClosingTotals,
  DEFAULT_CLOSING_DETAILS,
  type ClosingSheetDetails,
} from "@/types/closing-sheet";

function buildDetails(overrides: Partial<ClosingSheetDetails> = {}): ClosingSheetDetails {
  // structuredClone preserves nested defaults but lets each test mutate freely.
  const base = structuredClone(DEFAULT_CLOSING_DETAILS);
  return { ...base, ...overrides } as ClosingSheetDetails;
}

describe("computeClosingTotals — baseline", () => {
  it("zero details → zero totals, no NaN/Infinity", () => {
    const t = computeClosingTotals(buildDetails());
    expect(t.total_directos).toBe(0);
    expect(t.total_estaleiro).toBe(0);
    expect(t.custo_industrial).toBe(0);
    expect(t.valor_vendas).toBe(0);
    expect(t.rai_eur).toBeLessThanOrEqual(0); // pode ficar negativo pelo terreno/iva default = 0
    expect(t.rai_pct).toBe(0);
    expect(t.k_venda).toBe(0);
    expect(t.custo_m2_equivalente).toBe(0);
    expect(Number.isFinite(t.custo_total)).toBe(true);
  });
});

describe("computeClosingTotals — custos diretos", () => {
  it("aplica desconto por capítulo", () => {
    const d = buildDetails();
    d.direct_costs = d.direct_costs.map((l) => ({ ...l }));
    d.direct_costs[0] = { ...d.direct_costs[0], value: 1000, desconto_pct: 10 };
    d.direct_costs[1] = { ...d.direct_costs[1], value: 500, desconto_pct: 0 };
    const t = computeClosingTotals(d);
    // 1000 * 0.9 + 500 = 1400
    expect(t.total_directos).toBeCloseTo(1400, 5);
  });

  it("soma linha extra + estimativa por m²", () => {
    const d = buildDetails();
    d.direct_costs_extra = [{ id: "x1", label: "Extra", value: 200 }];
    d.direct_costs_estimate = 100;
    d.direct_costs_estimate_price_m2 = 50;
    d.statistics = { ...d.statistics, area_construcao: 10, area_caves: 0 };
    const t = computeClosingTotals(d);
    // 0 (capítulos a zero) + 100 (estimativa fixa) + 50*10 (estimativa m²) + 200 (extra)
    expect(t.total_directos).toBeCloseTo(800, 5);
  });
});

describe("computeClosingTotals — IVA e RAI", () => {
  it("base IVA Construção exclui mão-de-obra de estaleiro", () => {
    const d = buildDetails();
    d.direct_costs = d.direct_costs.map((l) => ({ ...l }));
    d.direct_costs[0] = { ...d.direct_costs[0], value: 1000 };
    d.site_costs = d.site_costs.map((l) =>
      l.key === "pessoal_obra" ? { ...l, value: 300 } : { ...l, value: 0 },
    );
    const t = computeClosingTotals(d);
    expect(t.custo_industrial).toBeCloseTo(1300, 5);
    // base IVA = custo industrial - mão-de-obra estaleiro (300)
    expect(t.base_iva_construcao).toBeCloseTo(1000, 5);
  });

  it("RAI = Vendas − Custo Total, RAI% relativo a Vendas, k_venda = Vendas/Custo", () => {
    const d = buildDetails();
    d.direct_costs = d.direct_costs.map((l) => ({ ...l }));
    d.direct_costs[0] = { ...d.direct_costs[0], value: 1000 };
    d.sales = [{ key: "f1", tipologia: "T2", quantidade: 1, area_priv: 100, preco_m2: 20 }];
    // Zera os pcts para isolar o cálculo: só temos directos=1000, vendas=2000.
    d.indirect = {
      honorarios_tecnicos: 0, seguros_pct: 0, financeiros: 0,
      taxas_impostos_prediais_pct: 0, publicidade_marketing_pct: 0,
      honorarios_gestao: 0, honorarios_comercializacao_pct: 0, garantias_pos_venda: 0,
    };
    d.other = {
      contratos_registos: 0, projectos_pct: 0, imprevistos_aleas_pct: 0,
      outros_taxas_ramais: 0, seguranca_higiene: 0, controlo_qualidade: 0,
    };
    d.admin = { estrutura_overhead: 0, fee_inter_grupo: 0, outros_administrativos: 0 };
    d.iva = { zona_aru: false, zona_oru: false, taxa_terreno_pct: 0, taxa_construcao_pct: 0, taxa_honorarios_pct: 0 };
    d.terrain = { ...d.terrain, preco_aquisicao: 0, taxa_imt_pct: 0, imposto_selo_pct: 0, custos_notario_pct: 0 };

    const t = computeClosingTotals(d);
    expect(t.valor_vendas).toBe(2000);
    expect(t.custo_total).toBeCloseTo(1000, 5);
    expect(t.rai_eur).toBeCloseTo(1000, 5);
    expect(t.rai_pct).toBeCloseTo(0.5, 5);
    expect(t.k_venda).toBeCloseTo(2, 5);
  });

  it("custo/m² usa override quando definido", () => {
    const d = buildDetails();
    d.direct_costs = d.direct_costs.map((l) => ({ ...l }));
    d.direct_costs[0] = { ...d.direct_costs[0], value: 5000 };
    d.statistics = { ...d.statistics, area_construcao: 50, area_caves: 50, area_total_construcao: 200 };
    const t = computeClosingTotals(d);
    // custo_m2 = custo_total / 200 (override), não / (50+50)
    expect(t.custo_m2_equivalente).toBeCloseTo(t.custo_total / 200, 5);
  });
});
