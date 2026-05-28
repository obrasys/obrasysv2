// Phase 3 - sugestão de artigos para uma medição de planta.
// Funciona sobre a lista de artigos já carregada em memória pelo
// componente de mapeamento (não acede ao DB). Devolve top-N candidatos
// com score, usado para mostrar "Sugestões Axia" inline.

import type { PlanMeasurement } from "@/types/plan-measurements";

export interface SuggestableArticle {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria?: string;
}

export interface ArticleSuggestion {
  article: SuggestableArticle;
  score: number;
  reason: string;
}

// Palavras-chave por tipo/camada de medição
const TYPE_KEYWORDS: Record<string, string[]> = {
  rodape: ["rodap"],
  rodapé: ["rodap"],
  parede: ["pared", "alvenar", "pintur", "estuq", "rebo", "tijol"],
  paredes: ["pared", "alvenar", "pintur", "estuq", "rebo", "tijol"],
  pavimento: ["paviment", "soalho", "ceramic", "porcelan", "vinilic", "lamin"],
  piso: ["paviment", "soalho", "ceramic", "porcelan"],
  teto: ["teto", "tecto", "pladur", "estuq"],
  tecto: ["teto", "tecto", "pladur"],
  porta: ["porta"],
  janela: ["janela", "vão", "vao"],
  vao: ["vão", "vao", "porta", "janela"],
  vão: ["vão", "vao", "porta", "janela"],
};

function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function keywordsFor(measurement: PlanMeasurement): string[] {
  const out = new Set<string>();
  const buckets = [measurement.tipo, measurement.camada, measurement.etiqueta]
    .filter(Boolean)
    .map((s) => normalize(String(s)));
  for (const b of buckets) {
    for (const word of b.split(/[\s\-_/]+/)) {
      if (TYPE_KEYWORDS[word]) {
        TYPE_KEYWORDS[word].forEach((k) => out.add(k));
      }
    }
  }
  return Array.from(out);
}

export function suggestArticlesForMeasurement(
  measurement: PlanMeasurement,
  articles: SuggestableArticle[],
  limit = 5
): ArticleSuggestion[] {
  const targetUnit = normalize(measurement.unidade || "");
  const kws = keywordsFor(measurement);
  const etiquetaNorm = normalize(measurement.etiqueta || measurement.tipo || "");
  const etiquetaWords = etiquetaNorm.split(/\s+/).filter((w) => w.length > 3);

  const scored: ArticleSuggestion[] = [];

  for (const a of articles) {
    const descNorm = normalize(a.descricao);
    let score = 0;
    const reasons: string[] = [];

    // Unidade compatível
    if (targetUnit && normalize(a.unidade) === targetUnit) {
      score += 5;
      reasons.push("unidade");
    }

    // Keywords do tipo
    for (const kw of kws) {
      if (descNorm.includes(kw)) {
        score += 4;
        reasons.push(kw);
        break;
      }
    }

    // Palavras da etiqueta
    for (const w of etiquetaWords) {
      if (descNorm.includes(w)) score += 1;
    }

    // Penalizar artigos sem preço (não exclui)
    if (!a.preco_unitario || a.preco_unitario <= 0) score -= 1;

    if (score >= 4) {
      scored.push({
        article: a,
        score,
        reason: reasons.slice(0, 2).join(" + ") || "match parcial",
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Agrupa medições que partilham assinatura (tipo + camada + unidade)
 * para permitir mapeamento em massa.
 */
export function measurementSignature(m: PlanMeasurement): string {
  return [
    normalize(m.tipo || ""),
    normalize(m.camada || ""),
    normalize(m.unidade || ""),
  ].join("|");
}
