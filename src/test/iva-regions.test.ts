/**
 * Regression tests for `src/lib/iva-regions.ts`.
 *
 * Locks the VAT rate matrix used everywhere in the budget engine:
 *   Continente: 23 / 13 / 6
 *   Madeira:    22 / 12 / 4
 *   Açores:     16 /  9 / 4
 *
 * Every regime also exposes 0% (autoliquidação). The "normal" rate is
 * always the first entry. `inferRegionFromRate` is the retro-compat hook
 * used when reopening legacy orçamentos without a stored region.
 */
import { describe, it, expect } from "vitest";
import {
  getIvaRegimesByRegion,
  getNormalRate,
  inferRegionFromRate,
  REGIAO_FISCAL_CONFIG,
  type RegiaoFiscal,
} from "@/lib/iva-regions";

describe("iva-regions matrix", () => {
  const cases: Array<[RegiaoFiscal, number[]]> = [
    ["continente", [23, 13, 6, 0]],
    ["madeira", [22, 12, 4, 0]],
    ["acores", [16, 9, 4, 0]],
  ];

  it.each(cases)("%s exposes the expected rates in order", (region, expected) => {
    const rates = getIvaRegimesByRegion(region).map((r) => r.value);
    expect(rates).toEqual(expected);
  });

  it.each(cases)("%s normal rate is the first non-zero rate", (region, expected) => {
    expect(getNormalRate(region)).toBe(expected[0]);
  });

  it("falls back to continente for unknown region", () => {
    // @ts-expect-error: deliberately invalid
    expect(getIvaRegimesByRegion("xpto").map((r) => r.value)).toEqual([23, 13, 6, 0]);
  });

  it("covers every region in REGIAO_FISCAL_CONFIG", () => {
    expect(Object.keys(REGIAO_FISCAL_CONFIG).sort()).toEqual(
      ["acores", "continente", "madeira"],
    );
  });
});

describe("inferRegionFromRate", () => {
  it("maps Madeira rates", () => {
    expect(inferRegionFromRate(22)).toBe("madeira");
    expect(inferRegionFromRate(12)).toBe("madeira");
  });

  it("maps Açores rates", () => {
    expect(inferRegionFromRate(16)).toBe("acores");
    expect(inferRegionFromRate(9)).toBe("acores");
  });

  it("rate 4 is ambiguous — defaults to madeira (first match)", () => {
    expect(inferRegionFromRate(4)).toBe("madeira");
  });

  it("defaults to continente for continente rates and 0", () => {
    expect(inferRegionFromRate(23)).toBe("continente");
    expect(inferRegionFromRate(13)).toBe("continente");
    expect(inferRegionFromRate(6)).toBe("continente");
    expect(inferRegionFromRate(0)).toBe("continente");
  });

  it("defaults to continente for unknown rate", () => {
    expect(inferRegionFromRate(99)).toBe("continente");
  });
});
