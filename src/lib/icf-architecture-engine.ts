/**
 * ICF Architecture & Specialties Engine
 * --------------------------------------
 * Deriva capítulos de orçamento para Arquitetura (acabamentos) e
 * Especialidades (instalações) a partir do resumo paramétrico ICF e,
 * quando disponíveis, dos quantitativos extraídos do módulo Plantas.
 *
 * Estratégia HÍBRIDA com fallback automático:
 *  - Se houver uma planta calibrada associada à obra, usa as áreas/perímetros
 *    medidos (mais precisos).
 *  - Caso contrário, deriva paramétricamente a partir do ICF
 *    (área de paredes interiores e exteriores, perímetro, lajes).
 *
 * Os valores devolvidos representam CUSTO (igual ao motor de estrutura).
 * A margem é aplicada na camada de leitura via PV = Custo / (1 - margem%).
 */

import type { IcfResumo, IcfConfiguracao } from '@/types/icf';
import type { PlanQuantitativoRow } from '@/hooks/usePlanQuantitativos';

export type IcfScopeArea =
  | 'pinturas'
  | 'pavimentos'
  | 'tetos_isolamentos'
  | 'instalacoes';

export interface IcfArchitectureScope {
  arquitetura: boolean; // pacote base de acabamentos
  especialidades: IcfScopeArea[]; // categorias selecionadas
}

export interface IcfBudgetArticle {
  codigo?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  match?: string[];
}

export interface IcfBudgetChapter {
  numero: number;
  titulo: string;
  descricao?: string;
  artigos: IcfBudgetArticle[];
}

interface PlanPriceRow {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria: string;
}

/* ════════════════════════════════════════════════════════════════════
 * Preços fallback (referência mercado PT 2025/2026 — €/un de custo)
 * ══════════════════════════════════════════════════════════════════ */
const PRICES = {
  // Pinturas
  primario_m2: 1.8,
  pintura_interior_m2: 4.5,
  pintura_exterior_m2: 7.2,
  // Pavimentos
  ceramico_m2: 22,
  flutuante_m2: 18,
  rodape_ml: 4.5,
  betonilha_m2: 9,
  // Tetos / isolamentos
  teto_falso_m2: 18,
  isolamento_la_mineral_m2: 9,
  // Instalações
  inst_eletrica_m2: 38,
  inst_aguas_m2: 22,
  inst_avac_m2: 45,
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function findPrice(
  precos: PlanPriceRow[],
  keywords: string[],
  unidade?: string,
): number | null {
  const kws = keywords.map(norm);
  const candidates = precos.filter((p) => {
    const text = norm(`${p.codigo} ${p.descricao} ${p.categoria}`);
    return kws.every((k) => text.includes(k));
  });
  const best = unidade
    ? candidates.find((c) => norm(c.unidade) === norm(unidade)) ??
      candidates[0]
    : candidates[0];
  return best?.preco_unitario ?? null;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function art(
  precos: PlanPriceRow[],
  descricao: string,
  unidade: string,
  quantidade: number,
  fallbackPrice: number,
  matchKeywords: string[],
): IcfBudgetArticle {
  const found = findPrice(precos, matchKeywords, unidade);
  return {
    descricao,
    unidade,
    quantidade: round(quantidade),
    preco_unitario: found ?? fallbackPrice,
    match: matchKeywords,
  };
}

/* ════════════════════════════════════════════════════════════════════
 * Quantitativos derivados — híbrido Plantas + ICF
 * ══════════════════════════════════════════════════════════════════ */

export interface DerivedArchitectureQuantities {
  /** Área útil de pavimento (m²) */
  area_pavimento_m2: number;
  /** Área de teto / forro (m²) — geralmente igual a pavimento */
  area_teto_m2: number;
  /** Perímetro total interior para rodapés (ml) */
  perimetro_rodape_ml: number;
  /** Área total a pintar interior (m²) — paredes interiores 2 faces + tetos */
  area_pintura_interior_m2: number;
  /** Área a pintar exterior (m²) */
  area_pintura_exterior_m2: number;
  /** Origem dos dados */
  source: 'plantas' | 'icf_parametric' | 'hybrid';
}

interface DeriveArgs {
  resumo: IcfResumo;
  config: IcfConfiguracao;
  planRows?: PlanQuantitativoRow[];
}

/**
 * Estratégia de derivação:
 *  - Se houver compartimentos com áreas em Plantas → usa-os para pavimento/teto.
 *  - Perímetro: usa medições "perimetro" da planta, ou deriva do ICF.
 *  - Pintura interior: 2 faces × área_liquida_total (paredes interiores) + tetos.
 *  - Pintura exterior: 1 face × área_liquida_total (assume metade exteriores
 *    se não for explícito) — conservador: usa a área total das paredes
 *    multiplicada por 0.5 quando vinda só do ICF.
 */
export function deriveArchitectureQuantities({
  resumo,
  config,
  planRows = [],
}: DeriveArgs): DerivedArchitectureQuantities {
  const hasPlan = planRows.length > 0;

  // Pavimento — soma compartimentos com unidade m² ou, fallback, lajes do ICF.
  const planFloorArea = planRows
    .filter(
      (r) =>
        r.source === 'compartimento' &&
        norm(r.unidade) === 'm2' &&
        norm(r.source_subtype || '').includes('floor'),
    )
    .reduce((s, r) => s + Number(r.valor || 0), 0);

  const area_pavimento_m2 =
    planFloorArea > 0
      ? planFloorArea
      : Math.max(resumo.area_estrutural_total || 0, 0);

  const area_teto_m2 = area_pavimento_m2;

  // Perímetro — procura medições do tipo "perimetro" / "rodape" na planta.
  const planPerimeter = planRows
    .filter((r) => {
      const u = norm(r.unidade);
      const d = norm(`${r.descricao} ${r.source_subtype || ''}`);
      return (
        (u === 'm' || u === 'ml') &&
        (d.includes('perimetro') || d.includes('rodape') || d.includes('baseboard'))
      );
    })
    .reduce((s, r) => s + Number(r.valor || 0), 0);

  // Fallback paramétrico: comprimento total das paredes ICF é uma proxy
  // (subestima divisórias interiores; assumimos +30%).
  const perimetro_rodape_ml =
    planPerimeter > 0
      ? planPerimeter
      : (resumo.comprimento_total_paredes || 0) * 1.3;

  // Pintura interior:
  //   paredes interiores (2 faces) ≈ área_liquida_total × 1.0 (interior)
  //   + divisórias internas estimadas em 50% das paredes ICF × 2 faces
  //   + tetos
  const areaParedesIcf = Math.max(resumo.area_liquida_total || 0, 0);
  const areaDivisoriasEstim = areaParedesIcf * 0.5; // proxy
  const area_pintura_interior_m2 =
    areaParedesIcf * 1.0 + areaDivisoriasEstim * 2.0 + area_teto_m2;

  // Pintura exterior: 1 face das paredes ICF perimetrais
  // (assumimos 60% das paredes ICF são exteriores quando não há planta).
  const area_pintura_exterior_m2 = areaParedesIcf * 0.6;

  const source: DerivedArchitectureQuantities['source'] = hasPlan
    ? planFloorArea > 0 || planPerimeter > 0
      ? 'hybrid'
      : 'icf_parametric'
    : 'icf_parametric';

  return {
    area_pavimento_m2: round(area_pavimento_m2),
    area_teto_m2: round(area_teto_m2),
    perimetro_rodape_ml: round(perimetro_rodape_ml),
    area_pintura_interior_m2: round(area_pintura_interior_m2),
    area_pintura_exterior_m2: round(area_pintura_exterior_m2),
    source,
  };
}

/* ════════════════════════════════════════════════════════════════════
 * Construtores de capítulos
 * ══════════════════════════════════════════════════════════════════ */

interface BuildArgs {
  resumo: IcfResumo;
  config: IcfConfiguracao;
  scope: IcfArchitectureScope;
  planRows?: PlanQuantitativoRow[];
  precos: PlanPriceRow[];
  /** Número de capítulo a partir do qual continuar (após estrutura) */
  startNumero: number;
}

export function buildArchitectureChapters({
  resumo,
  config,
  scope,
  planRows = [],
  precos,
  startNumero,
}: BuildArgs): { chapters: IcfBudgetChapter[]; quantities: DerivedArchitectureQuantities } {
  const chapters: IcfBudgetChapter[] = [];
  const q = deriveArchitectureQuantities({ resumo, config, planRows });
  let n = startNumero;

  const sourceLabel =
    q.source === 'hybrid'
      ? 'Planta + ICF'
      : q.source === 'plantas'
        ? 'Planta'
        : 'Estimativa paramétrica ICF';

  /* ── PINTURAS ─────────────────────────────────────────────────── */
  if (scope.especialidades.includes('pinturas')) {
    const artigos: IcfBudgetArticle[] = [];

    if (q.area_pintura_interior_m2 > 0) {
      artigos.push(
        art(
          precos,
          'Primário selante para paredes e tetos interiores',
          'm²',
          q.area_pintura_interior_m2,
          PRICES.primario_m2,
          ['primario'],
        ),
      );
      artigos.push(
        art(
          precos,
          'Pintura interior (2 demãos) — paredes e tetos',
          'm²',
          q.area_pintura_interior_m2,
          PRICES.pintura_interior_m2,
          ['pintura', 'interior'],
        ),
      );
    }

    if (q.area_pintura_exterior_m2 > 0) {
      artigos.push(
        art(
          precos,
          'Pintura exterior (texturada / lisa) — fachadas',
          'm²',
          q.area_pintura_exterior_m2,
          PRICES.pintura_exterior_m2,
          ['pintura', 'exterior'],
        ),
      );
    }

    if (artigos.length > 0) {
      chapters.push({
        numero: n++,
        titulo: 'Pinturas',
        descricao: `Pinturas interior e exterior — base: ${sourceLabel}`,
        artigos,
      });
    }
  }

  /* ── PAVIMENTOS E REVESTIMENTOS ───────────────────────────────── */
  if (scope.especialidades.includes('pavimentos')) {
    const artigos: IcfBudgetArticle[] = [];

    if (q.area_pavimento_m2 > 0) {
      artigos.push(
        art(
          precos,
          'Betonilha de regularização (4-6cm)',
          'm²',
          q.area_pavimento_m2,
          PRICES.betonilha_m2,
          ['betonilha'],
        ),
      );
      // 60% cerâmico (zonas húmidas/sociais), 40% flutuante (quartos) — proxy editável
      const areaCeramico = q.area_pavimento_m2 * 0.6;
      const areaFlutuante = q.area_pavimento_m2 * 0.4;
      artigos.push(
        art(
          precos,
          'Pavimento cerâmico 60×60 — assentamento e rejuntamento',
          'm²',
          areaCeramico,
          PRICES.ceramico_m2,
          ['ceramico'],
        ),
      );
      artigos.push(
        art(
          precos,
          'Pavimento flutuante AC4 — colocação',
          'm²',
          areaFlutuante,
          PRICES.flutuante_m2,
          ['flutuante'],
        ),
      );
    }

    if (q.perimetro_rodape_ml > 0) {
      artigos.push(
        art(
          precos,
          'Rodapé MDF lacado — colocação',
          'ml',
          q.perimetro_rodape_ml,
          PRICES.rodape_ml,
          ['rodape'],
        ),
      );
    }

    if (artigos.length > 0) {
      chapters.push({
        numero: n++,
        titulo: 'Pavimentos e Revestimentos',
        descricao: `Pavimentação interior — base: ${sourceLabel}`,
        artigos,
      });
    }
  }

  /* ── TETOS FALSOS E ISOLAMENTOS ──────────────────────────────── */
  if (scope.especialidades.includes('tetos_isolamentos')) {
    const artigos: IcfBudgetArticle[] = [];

    if (q.area_teto_m2 > 0) {
      artigos.push(
        art(
          precos,
          'Teto falso em pladur 13mm — estrutura metálica',
          'm²',
          q.area_teto_m2,
          PRICES.teto_falso_m2,
          ['teto', 'falso'],
        ),
      );
      artigos.push(
        art(
          precos,
          'Isolamento térmico/acústico em lã mineral 60mm',
          'm²',
          q.area_teto_m2,
          PRICES.isolamento_la_mineral_m2,
          ['isolamento', 'la mineral'],
        ),
      );
    }

    if (artigos.length > 0) {
      chapters.push({
        numero: n++,
        titulo: 'Tetos Falsos e Isolamentos',
        descricao: `Tetos suspensos e isolamentos — base: ${sourceLabel}`,
        artigos,
      });
    }
  }

  /* ── INSTALAÇÕES ──────────────────────────────────────────────── */
  if (scope.especialidades.includes('instalacoes')) {
    const artigos: IcfBudgetArticle[] = [];

    if (q.area_pavimento_m2 > 0) {
      artigos.push(
        art(
          precos,
          'Instalação elétrica — quadro, tubagem, cabos, tomadas e iluminação',
          'm²',
          q.area_pavimento_m2,
          PRICES.inst_eletrica_m2,
          ['eletrica'],
        ),
      );
      artigos.push(
        art(
          precos,
          'Instalação de águas e esgotos — rede predial',
          'm²',
          q.area_pavimento_m2,
          PRICES.inst_aguas_m2,
          ['aguas', 'esgotos'],
        ),
      );
      artigos.push(
        art(
          precos,
          'AVAC — climatização e ventilação (multi-split)',
          'm²',
          q.area_pavimento_m2,
          PRICES.inst_avac_m2,
          ['avac', 'climatizacao'],
        ),
      );
    }

    if (artigos.length > 0) {
      chapters.push({
        numero: n++,
        titulo: 'Instalações Técnicas',
        descricao: `Instalações elétricas, águas e AVAC — base: ${sourceLabel}. Para detalhe paramétrico, use o módulo Instalações.`,
        artigos,
      });
    }
  }

  return { chapters, quantities: q };
}
