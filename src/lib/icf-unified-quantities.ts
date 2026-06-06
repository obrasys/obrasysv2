/**
 * Fase 6 — Quantitativos ICF unificados (PDF + DXF)
 *
 * Recebe um IcfPlantAnalysisResult (origem indistinta: análise IA de PDF ou
 * parser vetorial DXF) e devolve uma agregação consolidada pronta a rever
 * antes de fechar o orçamento ICF. Não persiste nada — é puro cálculo
 * determinístico para o painel de revisão técnica.
 */

import type { IcfPlantAnalysisResult } from "@/hooks/useIcfPlantAnalysis";

export interface IcfUnifiedParams {
  /** Pé-direito por defeito (m) quando a parede não tem altura legível. */
  peDireitoPadrao: number;
  /** Espessura do núcleo de betão (m) por defeito. */
  espessuraNucleoPadrao: number;
  /** % desperdício de bloco (0–1). */
  percentDesperdicio: number;
  /** Se true, áreas líquidas descontam vãos (portas/janelas). */
  descontarVaos: boolean;
  /** kg de armadura por m³ de betão (estimativa global). */
  kgArmaduraPorM3: number;
  /** Dimensões do bloco ICF de referência (mm). */
  bloco: { codigo: string; comprimentoMm: number; alturaMm: number };
  /** Incluir fundações no totalizador de betão/armadura? */
  incluirFundacoes: boolean;
}

export interface IcfQuantPanoLinha {
  referencia: string;
  tipo: "exterior" | "interior" | "indeterminado";
  comprimento_m: number;
  altura_m: number;
  espessura_m: number;
  area_bruta_m2: number;
  area_vaos_m2: number;
  area_liquida_m2: number;
  blocos_estimados: number;
  volume_betao_m3: number;
  confianca: number | null;
  requires_review: boolean;
  notas?: string | null;
}

export interface IcfUnifiedTotais {
  ml_ext: number;
  ml_int: number;
  ml_total: number;
  area_bruta_m2: number;
  area_vaos_m2: number;
  area_liquida_m2: number;
  blocos_total: number;
  blocos_com_desperdicio: number;
  volume_betao_paredes_m3: number;
  volume_betao_fundacoes_m3: number;
  volume_betao_lajes_m3: number;
  volume_betao_total_m3: number;
  armadura_kg: number;
  paredes_revisao: number;
  paredes_total: number;
  confianca_media: number | null;
}

export interface IcfUnifiedQuantities {
  params: IcfUnifiedParams;
  linhas: IcfQuantPanoLinha[];
  totais: IcfUnifiedTotais;
  origem: "ai" | "dxf" | "desconhecida";
  avisos: string[];
}

const EXT_RX = /(^|[\s_-])(pe|ext|exterior|fachada|me)([\s_-]|\d|$)/i;
const INT_RX = /(^|[\s_-])(pi|int|interior|divis)/i;

function classifyTipoParede(ref: string): IcfQuantPanoLinha["tipo"] {
  if (EXT_RX.test(ref)) return "exterior";
  if (INT_RX.test(ref)) return "interior";
  return "indeterminado";
}

function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function buildIcfUnifiedQuantities(
  result: IcfPlantAnalysisResult | null,
  params: IcfUnifiedParams,
): IcfUnifiedQuantities {
  const avisos: string[] = [];
  if (!result) {
    return {
      params,
      linhas: [],
      avisos: ["Sem resultado de análise para consolidar."],
      origem: "desconhecida",
      totais: emptyTotais(),
    };
  }

  const blockAreaM2 =
    (params.bloco.comprimentoMm / 1000) * (params.bloco.alturaMm / 1000);

  const linhas: IcfQuantPanoLinha[] = result.paredes.map((p) => {
    const comprimento = Number(p.comprimento) || 0;
    const altura =
      p.altura_util && p.altura_util >= 1.5 ? p.altura_util : params.peDireitoPadrao;
    const espessura =
      p.espessura_nucleo && p.espessura_nucleo >= 0.05
        ? p.espessura_nucleo
        : params.espessuraNucleoPadrao;

    const areaBruta = comprimento * altura;
    const areaVaos = (p.vaos || []).reduce(
      (s, v) => s + (Number(v.largura) || 0) * (Number(v.altura) || 0) * (Number(v.quantidade) || 1),
      0,
    );
    const areaLiquida = Math.max(
      areaBruta - (params.descontarVaos ? areaVaos : 0),
      0,
    );

    const blocos = blockAreaM2 > 0 ? Math.ceil(areaLiquida / blockAreaM2) : 0;
    const volumeBetao = areaLiquida * espessura;

    const conf = typeof p.confianca === "number" ? p.confianca : null;
    const requiresReview =
      (conf !== null && conf < 0.6) ||
      p.metodo_medicao === "estimativa_visual" ||
      !p.altura_util ||
      p.altura_util < 1.5;

    return {
      referencia: p.referencia,
      tipo: classifyTipoParede(p.referencia || ""),
      comprimento_m: round(comprimento, 2),
      altura_m: round(altura, 2),
      espessura_m: round(espessura, 3),
      area_bruta_m2: round(areaBruta, 2),
      area_vaos_m2: round(areaVaos, 2),
      area_liquida_m2: round(areaLiquida, 2),
      blocos_estimados: blocos,
      volume_betao_m3: round(volumeBetao, 3),
      confianca: conf,
      requires_review: requiresReview,
      notas: p.notas_validacao ?? null,
    };
  });

  const mlExt = linhas
    .filter((l) => l.tipo === "exterior")
    .reduce((s, l) => s + l.comprimento_m, 0);
  const mlInt = linhas
    .filter((l) => l.tipo === "interior")
    .reduce((s, l) => s + l.comprimento_m, 0);
  const mlInd = linhas
    .filter((l) => l.tipo === "indeterminado")
    .reduce((s, l) => s + l.comprimento_m, 0);

  if (mlInd > 0) {
    avisos.push(
      `${mlInd.toFixed(1)} m de parede sem classificação ext/int — atribuídos a "indeterminado".`,
    );
  }

  const areaBruta = linhas.reduce((s, l) => s + l.area_bruta_m2, 0);
  const areaVaos = linhas.reduce((s, l) => s + l.area_vaos_m2, 0);
  const areaLiquida = linhas.reduce((s, l) => s + l.area_liquida_m2, 0);
  const blocosBase = linhas.reduce((s, l) => s + l.blocos_estimados, 0);
  const blocosCD = Math.ceil(blocosBase * (1 + Math.max(0, params.percentDesperdicio)));

  const volParedes = linhas.reduce((s, l) => s + l.volume_betao_m3, 0);
  const volFund = params.incluirFundacoes
    ? (result.fundacoes || []).reduce(
        (s, f) =>
          s +
          (Number(f.comprimento) || 0) *
            (Number(f.largura) || 0) *
            (Number(f.altura) || 0) *
            (Number(f.quantidade) || 1),
        0,
      )
    : 0;
  const volLajes = (result.lajes || []).reduce(
    (s, l) => s + (Number(l.area) || 0) * (Number(l.espessura_total) || 0),
    0,
  );
  const volTotal = volParedes + volFund + volLajes;

  const confValores = linhas
    .map((l) => l.confianca)
    .filter((c): c is number => typeof c === "number");
  const confMedia =
    confValores.length > 0
      ? confValores.reduce((a, b) => a + b, 0) / confValores.length
      : null;

  const paredesRevisao = linhas.filter((l) => l.requires_review).length;

  if (linhas.length === 0) {
    avisos.push("Nenhuma parede consolidada — verifique a análise.");
  }
  if (paredesRevisao > 0) {
    avisos.push(
      `${paredesRevisao} parede(s) requerem revisão humana antes de ir para orçamento.`,
    );
  }

  const origem: IcfUnifiedQuantities["origem"] =
    (result as any).__source === "dxf"
      ? "dxf"
      : (result as any).__source === "ai"
        ? "ai"
        : "desconhecida";

  return {
    params,
    linhas,
    origem,
    avisos,
    totais: {
      ml_ext: round(mlExt, 2),
      ml_int: round(mlInt, 2),
      ml_total: round(mlExt + mlInt + mlInd, 2),
      area_bruta_m2: round(areaBruta, 2),
      area_vaos_m2: round(areaVaos, 2),
      area_liquida_m2: round(areaLiquida, 2),
      blocos_total: blocosBase,
      blocos_com_desperdicio: blocosCD,
      volume_betao_paredes_m3: round(volParedes, 3),
      volume_betao_fundacoes_m3: round(volFund, 3),
      volume_betao_lajes_m3: round(volLajes, 3),
      volume_betao_total_m3: round(volTotal, 3),
      armadura_kg: round(volTotal * params.kgArmaduraPorM3, 1),
      paredes_revisao: paredesRevisao,
      paredes_total: linhas.length,
      confianca_media: confMedia !== null ? round(confMedia, 2) : null,
    },
  };
}

function emptyTotais(): IcfUnifiedTotais {
  return {
    ml_ext: 0,
    ml_int: 0,
    ml_total: 0,
    area_bruta_m2: 0,
    area_vaos_m2: 0,
    area_liquida_m2: 0,
    blocos_total: 0,
    blocos_com_desperdicio: 0,
    volume_betao_paredes_m3: 0,
    volume_betao_fundacoes_m3: 0,
    volume_betao_lajes_m3: 0,
    volume_betao_total_m3: 0,
    armadura_kg: 0,
    paredes_revisao: 0,
    paredes_total: 0,
    confianca_media: null,
  };
}

export const DEFAULT_ICF_UNIFIED_PARAMS: IcfUnifiedParams = {
  peDireitoPadrao: 2.7,
  espessuraNucleoPadrao: 0.15,
  percentDesperdicio: 0.05,
  descontarVaos: true,
  kgArmaduraPorM3: 60,
  bloco: { codigo: "HB-BLOCO-220", comprimentoMm: 1200, alturaMm: 400 },
  incluirFundacoes: true,
};
