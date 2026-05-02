// Auto-matching de placeholders/vãos do gerador de pré-orçamento (planta) contra a
// Base de Preços do utilizador (`base_artigos_user`) com fallback para a Base
// Global (`base_artigos_global`). Devolve preço indicativo + código + descrição
// real, evitando que o orçamento fique com `preco_unitario = 0`.

import { supabase } from "@/integrations/supabase/client";
import type { TipoBase } from "@/hooks/useBaseArtigos";

export interface BaseArticleMatch {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  capitulo: string | null;
  origem: "user" | "global";
}

export interface PlaceholderToMatch {
  /** Identificador único do placeholder (id usado no consolidated) */
  key: string;
  /** Descrição/etiqueta para tentar match (ex: "Rodapé — fornecimento e aplicação") */
  descricao: string;
  /** Unidade esperada (m, m2, un...) */
  unidade: string;
  /** Capítulo sugerido (ex: "Acabamentos — Rodapé", "Vãos — Portas e Janelas") */
  capituloHint?: string;
  /** Palavras-chave adicionais para refinar o match (ex: porta, janela, rodapé) */
  keywords?: string[];
}

// Mapa de palavras-chave por bucket — usado quando não há keywords explícitas
const BUCKET_KEYWORDS: Record<string, string[]> = {
  "Acabamentos — Rodapé": ["rodap"],
  "Acabamentos — Paredes": ["pared", "pintur", "revestiment"],
  "Acabamentos — Pavimentos e Tetos": ["paviment", "soalho", "ceramic", "teto", "tecto"],
  "Vãos — Portas e Janelas": ["porta", "janela", "vão", "vao", "portao"],
};

function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function scoreMatch(
  candidato: { artigo: string; capitulo: string | null; unidade: string },
  target: { descricaoNorm: string; unidade: string; capituloKeywords: string[]; ownKeywords: string[] }
): number {
  const artigoNorm = normalize(candidato.artigo);
  const capituloNorm = normalize(candidato.capitulo ?? "");
  let score = 0;

  // Match de unidade vale muito (não queremos m² casar com un)
  if (candidato.unidade && target.unidade && normalize(candidato.unidade) === normalize(target.unidade)) {
    score += 5;
  }

  // Keywords próprias do placeholder (ex: "porta interior")
  for (const kw of target.ownKeywords) {
    const k = normalize(kw);
    if (!k) continue;
    if (artigoNorm.includes(k)) score += 4;
    else if (capituloNorm.includes(k)) score += 2;
  }

  // Keywords do bucket (rodapé, parede, etc.)
  for (const kw of target.capituloKeywords) {
    if (artigoNorm.includes(kw)) score += 3;
    else if (capituloNorm.includes(kw)) score += 1;
  }

  // Match parcial de palavras da descrição original
  const palavras = target.descricaoNorm.split(/\s+/).filter((w) => w.length > 3);
  for (const p of palavras) {
    if (artigoNorm.includes(p)) score += 1;
  }

  return score;
}

/**
 * Tenta resolver preços para um conjunto de placeholders. Retorna um Map
 * `key → BaseArticleMatch` apenas para os que tiveram match útil (score>=4).
 */
export async function autoMatchPlaceholdersAgainstBase(
  placeholders: PlaceholderToMatch[],
  tipoBase: TipoBase,
  userId: string
): Promise<Map<string, BaseArticleMatch>> {
  const result = new Map<string, BaseArticleMatch>();
  if (placeholders.length === 0) return result;

  // 1. Carregar base do utilizador (filtrada por tipoBase)
  const { data: userBase } = await supabase
    .from("base_artigos_user" as any)
    .select("codigo, artigo, unidade, preco_indicativo_eur, capitulo")
    .eq("user_id", userId)
    .eq("tipo_base", tipoBase);

  // 2. Carregar base global (mesmo tipo) — usado como fallback
  const { data: globalBase } = await supabase
    .from("base_artigos_global" as any)
    .select("codigo, artigo, unidade, preco_indicativo_eur, capitulo")
    .eq("tipo_base", tipoBase);

  type Row = { codigo: string; artigo: string; unidade: string; preco_indicativo_eur: number | null; capitulo: string | null };
  const userRows = (userBase ?? []) as unknown as Row[];
  const globalRows = (globalBase ?? []) as unknown as Row[];

  for (const ph of placeholders) {
    const descricaoNorm = normalize(ph.descricao);
    const bucketKw = (ph.capituloHint && BUCKET_KEYWORDS[ph.capituloHint]) || [];
    const ownKw = ph.keywords ?? [];

    const tryFind = (rows: Row[], origem: "user" | "global"): BaseArticleMatch | null => {
      let best: { score: number; row: Row } | null = null;
      for (const r of rows) {
        if (!r.artigo) continue;
        const s = scoreMatch(
          { artigo: r.artigo, capitulo: r.capitulo, unidade: r.unidade },
          { descricaoNorm, unidade: ph.unidade, capituloKeywords: bucketKw, ownKeywords: ownKw }
        );
        if (!best || s > best.score) best = { score: s, row: r };
      }
      if (!best || best.score < 4) return null;
      return {
        codigo: best.row.codigo,
        descricao: best.row.artigo,
        unidade: best.row.unidade || ph.unidade,
        preco_unitario: Number(best.row.preco_indicativo_eur ?? 0),
        capitulo: best.row.capitulo,
        origem,
      };
    };

    const userMatch = tryFind(userRows, "user");
    if (userMatch && userMatch.preco_unitario > 0) {
      result.set(ph.key, userMatch);
      continue;
    }
    const globalMatch = tryFind(globalRows, "global");
    if (globalMatch && globalMatch.preco_unitario > 0) {
      result.set(ph.key, globalMatch);
    }
  }

  return result;
}
