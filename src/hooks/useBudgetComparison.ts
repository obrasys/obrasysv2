import { useMemo } from "react";
import { useOrcamento } from "@/hooks/useOrcamentos";
import type { ArtigoOrcamento, Capitulo } from "@/types/orcamentos";

export type ItemChangeStatus = "original" | "alterado" | "novo";

export interface BaseItemSnapshot {
  codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_base: number;
  preco_unitario: number;
  valor_total: number;
}

export interface BudgetComparison {
  /** Por capítulo (chave: capitulo.numero|titulo do current). */
  baseChaptersByKey: Map<string, Capitulo & { artigos?: ArtigoOrcamento[] }>;
  /** Lookup de artigo base por chave estável (capituloKey|codigo|descricao). */
  baseItemsByKey: Map<string, BaseItemSnapshot>;
  totals: {
    baseCusto: number;
    baseVenda: number;
    currCusto: number;
    currVenda: number;
    novos: number;
    alterados: number;
  };
}

const EPS = 0.01;

const itemCusto = (a: Partial<ArtigoOrcamento>) =>
  Number(a.preco_base ?? a.preco_unitario ?? 0) * Number(a.quantidade ?? 0);

const itemVenda = (a: Partial<ArtigoOrcamento>) =>
  Number(a.valor_total ?? Number(a.preco_unitario ?? 0) * Number(a.quantidade ?? 0));

export const chapterKey = (c: Pick<Capitulo, "numero" | "titulo">) =>
  `${c.numero}|${(c.titulo ?? "").trim().toLowerCase()}`;

export const itemKey = (chKey: string, a: Pick<ArtigoOrcamento, "codigo" | "descricao">) =>
  `${chKey}|${(a.codigo ?? "").trim().toLowerCase()}|${(a.descricao ?? "").trim().toLowerCase()}`;

export function classifyItem(
  current: ArtigoOrcamento,
  chKey: string,
  baseItemsByKey: Map<string, BaseItemSnapshot>,
): { status: ItemChangeStatus; base?: BaseItemSnapshot } {
  const base = baseItemsByKey.get(itemKey(chKey, current));
  if (!base) return { status: "novo" };
  const changed =
    Math.abs(Number(current.quantidade ?? 0) - base.quantidade) > EPS ||
    Math.abs(Number(current.preco_base ?? current.preco_unitario ?? 0) - base.preco_base) > EPS ||
    Math.abs(Number(current.preco_unitario ?? 0) - base.preco_unitario) > EPS ||
    (current.descricao ?? "") !== base.descricao;
  return { status: changed ? "alterado" : "original", base };
}

export function useBudgetComparison(baseId: string, currentVersion: { capitulos?: (Capitulo & { artigos?: ArtigoOrcamento[] })[] } | undefined): BudgetComparison {
  const { orcamento: base } = useOrcamento(baseId);

  return useMemo(() => {
    const baseChaptersByKey = new Map<string, Capitulo & { artigos?: ArtigoOrcamento[] }>();
    const baseItemsByKey = new Map<string, BaseItemSnapshot>();
    let baseCusto = 0;
    let baseVenda = 0;

    for (const cap of base?.capitulos ?? []) {
      const k = chapterKey(cap);
      baseChaptersByKey.set(k, cap);
      for (const art of cap.artigos ?? []) {
        const snap: BaseItemSnapshot = {
          codigo: art.codigo ?? null,
          descricao: art.descricao ?? "",
          unidade: art.unidade ?? "",
          quantidade: Number(art.quantidade ?? 0),
          preco_base: Number(art.preco_base ?? art.preco_unitario ?? 0),
          preco_unitario: Number(art.preco_unitario ?? 0),
          valor_total: itemVenda(art),
        };
        baseItemsByKey.set(itemKey(k, art), snap);
        baseCusto += snap.preco_base * snap.quantidade;
        baseVenda += snap.valor_total;
      }
    }

    let currCusto = 0;
    let currVenda = 0;
    let novos = 0;
    let alterados = 0;
    for (const cap of currentVersion?.capitulos ?? []) {
      const k = chapterKey(cap);
      for (const art of cap.artigos ?? []) {
        currCusto += itemCusto(art);
        currVenda += itemVenda(art);
        const { status } = classifyItem(art, k, baseItemsByKey);
        if (status === "novo") novos++;
        else if (status === "alterado") alterados++;
      }
    }

    return {
      baseChaptersByKey,
      baseItemsByKey,
      totals: { baseCusto, baseVenda, currCusto, currVenda, novos, alterados },
    };
  }, [base, currentVersion]);
}
