/**
 * Heurísticas offline para classificar folhas de plantas (arquitetura vs estrutura)
 * a partir do título / código de desenho / texto OCR.
 * Usado como override determinístico após Axia (Gemini) classificar.
 */

export type SheetDiscipline = "arquitetura" | "estrutura" | "mep" | "outro";

export type SheetType =
  // Arquitetura
  | "planta_arquitetura"
  | "floor_plan"
  | "roof_plan"
  | "cobertura"
  | "alcado"
  | "elevation"
  | "corte"
  | "section"
  // Estrutura
  | "planta_fundacoes"
  | "foundation_plan"
  | "planta_estrutural"
  | "structural_floor_plan"
  | "armaduras_sapatas"
  | "reinforcement_detail"
  | "armaduras_vigas"
  | "beam_reinforcement"
  | "armaduras_lajes"
  | "slab_reinforcement"
  | "armaduras_paredes"
  | "wall_reinforcement"
  | "quadro_pilares"
  | "pormenor_icf"
  | "icf_detail"
  | "pormenor_metalico"
  | "metallic_structure_detail"
  // Outro
  | "outro"
  | "unknown";

export type DetectedFloor =
  | "fundacao"
  | "piso_-1"
  | "piso_0"
  | "piso_1"
  | "piso_2"
  | "cobertura"
  | "exterior"
  | "multi_floor"
  | "generico";

export interface SheetClassification {
  discipline: SheetDiscipline;
  sheet_type: SheetType;
  detected_floor: DetectedFloor;
  should_extract_quantities: boolean;
  use_for_validation_only: boolean;
  confidence: number;
  warnings: string[];
}

const norm = (s: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const matchAny = (txt: string, re: RegExp[]) => re.some((r) => r.test(txt));

/**
 * Classificação determinística a partir do título / código / OCR.
 * Aplica regras na ordem mais específica → mais genérica.
 */
export function classifySheetHeuristic(text: string): SheetClassification {
  const t = norm(text);
  const warnings: string[] = [];

  let discipline: SheetDiscipline = "outro";
  let sheet_type: SheetType = "unknown";
  let detected_floor: DetectedFloor = "generico";
  let confidence = 0.4;

  // --- ESTRUTURA / ESTABILIDADE (alta prioridade — palavras-chave fortes) ---
  if (matchAny(t, [/pormenor.*icf|icf.*pormenor/])) {
    discipline = "estrutura"; sheet_type = "icf_detail"; confidence = 0.9;
  } else if (matchAny(t, [/pormenor.*metal|liga[cç][oõã]es?\s+metalic/])) {
    discipline = "estrutura"; sheet_type = "metallic_structure_detail"; confidence = 0.9;
  } else if (matchAny(t, [/armadur.*sapata|sapata.*armadur/])) {
    discipline = "estrutura"; sheet_type = "reinforcement_detail"; detected_floor = "fundacao"; confidence = 0.9;
  } else if (matchAny(t, [/armadur.*pared|pared.*armadur|refor[cç]os?\s+em\s+abertur/])) {
    discipline = "estrutura"; sheet_type = "wall_reinforcement"; confidence = 0.85;
  } else if (matchAny(t, [/armadur.*viga|viga.*armadur/])) {
    discipline = "estrutura"; sheet_type = "beam_reinforcement"; confidence = 0.85;
  } else if (matchAny(t, [/armadur.*laje|laje.*armadur/])) {
    discipline = "estrutura"; sheet_type = "slab_reinforcement"; confidence = 0.85;
  } else if (matchAny(t, [/planta\s+de\s+funda[cç][oõã]es|funda[cç][oõã]es?/])) {
    discipline = "estrutura"; sheet_type = "foundation_plan"; detected_floor = "fundacao"; confidence = 0.9;
  } else if (matchAny(t, [/plantas?\s+estrutur(al|ais)|planta\s+estabilidad/])) {
    discipline = "estrutura"; sheet_type = "structural_floor_plan"; confidence = 0.85;
  } else if (matchAny(t, [/quadro\s+de\s+pilar|\bpilares?\b/, /\bp[oó]rticos?\b/])) {
    discipline = "estrutura"; sheet_type = "quadro_pilares"; confidence = 0.8;
  } else if (matchAny(t, [/\bperfis?\s+metalic/, /\bheb\b|\bipe\b|\bhea\b/])) {
    discipline = "estrutura"; sheet_type = "metallic_structure_detail"; confidence = 0.85;
  } else if (matchAny(t, [/\bestabilidade\b|\bbet[aã]o\s+armado\b/])) {
    discipline = "estrutura"; sheet_type = "structural_floor_plan"; confidence = 0.7;
  }
  // --- COBERTURA ---
  else if (matchAny(t, [/planta\s+da?\s+cobertura|^cobertura$|\bcobertura\b/])) {
    discipline = "arquitetura"; sheet_type = "roof_plan"; detected_floor = "cobertura"; confidence = 0.9;
  }
  // --- ALÇADOS ---
  else if (matchAny(t, [/al[cç]ado|fachada/])) {
    discipline = "arquitetura"; sheet_type = "elevation"; detected_floor = "exterior"; confidence = 0.85;
  }
  // --- CORTES ---
  else if (matchAny(t, [/\bcorte\s+[a-z]\s*-\s*[a-z]|\bcorte\s+(longitudinal|transversal)|\bsec[cç][aã]o\b/])) {
    discipline = "arquitetura"; sheet_type = "section"; detected_floor = "multi_floor"; confidence = 0.85;
  }
  // --- ARQUITETURA — PLANTAS POR PISO ---
  else if (matchAny(t, [/planta.*(r\s*\/?\s*ch|res-do-chao|res\s+do\s+chao|piso\s*0|t[eé]rreo)/])) {
    discipline = "arquitetura"; sheet_type = "floor_plan"; detected_floor = "piso_0"; confidence = 0.85;
  } else if (matchAny(t, [/planta.*(1[ºo°]?\s*(andar|piso)|piso\s*1)/])) {
    discipline = "arquitetura"; sheet_type = "floor_plan"; detected_floor = "piso_1"; confidence = 0.85;
  } else if (matchAny(t, [/planta.*(2[ºo°]?\s*(andar|piso)|piso\s*2)/])) {
    discipline = "arquitetura"; sheet_type = "floor_plan"; detected_floor = "piso_2"; confidence = 0.85;
  } else if (matchAny(t, [/planta.*(cave|piso\s*-1|sub\s*-?\s*solo)/])) {
    discipline = "arquitetura"; sheet_type = "floor_plan"; detected_floor = "piso_-1"; confidence = 0.85;
  } else if (matchAny(t, [/\bcompartiment|cozinha|sala|quartos?|\bi\.?s\.?\b|garagem|lavandaria|despensa|varanda|terra[cç]o/])) {
    discipline = "arquitetura"; sheet_type = "floor_plan"; confidence = 0.7;
  } else if (matchAny(t, [/planta.*(arquitet)/])) {
    discipline = "arquitetura"; sheet_type = "planta_arquitetura"; confidence = 0.65;
  }

  // --- Piso fallback ---
  if (detected_floor === "generico") {
    if (/\bcave\b|\bpiso\s*-?\s*1\b|\bsub\s*-?\s*solo\b/.test(t)) detected_floor = "piso_-1";
    else if (/\b(r\s*\/?\s*c|res\s*-?\s*do\s*-?\s*chao|piso\s*0|t[eé]rreo)\b/.test(t)) detected_floor = "piso_0";
    else if (/\b(1[ºo°]?\s*(andar|piso)|piso\s*1)\b/.test(t)) detected_floor = "piso_1";
    else if (/\b(2[ºo°]?\s*(andar|piso)|piso\s*2)\b/.test(t)) detected_floor = "piso_2";
  }

  // --- Flags ---
  const validationOnlyTypes: SheetType[] = [
    "alcado", "elevation", "corte", "section", "pormenor_icf", "icf_detail",
    "pormenor_metalico", "metallic_structure_detail",
  ];
  const use_for_validation_only = validationOnlyTypes.includes(sheet_type);
  const should_extract_quantities = !use_for_validation_only && sheet_type !== "unknown";

  if (!text || text.trim().length < 4) {
    warnings.push("Texto da folha insuficiente para classificação fiável.");
    confidence = Math.min(confidence, 0.4);
  }
  if (sheet_type === "unknown") {
    warnings.push("Tipo de folha não identificado.");
  }

  return {
    discipline,
    sheet_type,
    detected_floor,
    should_extract_quantities,
    use_for_validation_only,
    confidence,
    warnings,
  };
}

export const SHEET_TYPE_LABEL: Record<SheetType, string> = {
  planta_arquitetura: "Planta de Arquitetura",
  floor_plan: "Planta de Arquitetura",
  roof_plan: "Planta da Cobertura",
  cobertura: "Cobertura",
  alcado: "Alçado",
  elevation: "Alçado",
  corte: "Corte",
  section: "Corte/Secção",
  planta_fundacoes: "Planta de Fundações",
  foundation_plan: "Planta de Fundações",
  planta_estrutural: "Planta Estrutural",
  structural_floor_plan: "Planta Estrutural",
  armaduras_sapatas: "Armaduras de Sapatas",
  reinforcement_detail: "Armaduras / Pormenor",
  armaduras_vigas: "Armaduras de Vigas",
  beam_reinforcement: "Armaduras de Vigas",
  armaduras_lajes: "Armaduras de Lajes",
  slab_reinforcement: "Armaduras de Lajes",
  armaduras_paredes: "Armaduras de Paredes",
  wall_reinforcement: "Armaduras de Paredes",
  quadro_pilares: "Quadro de Pilares",
  pormenor_icf: "Pormenor ICF",
  icf_detail: "Pormenor ICF",
  pormenor_metalico: "Pormenor Metálico",
  metallic_structure_detail: "Pormenor Metálico",
  outro: "Outro",
  unknown: "Desconhecido",
};

export const DISCIPLINE_LABEL: Record<SheetDiscipline, string> = {
  arquitetura: "Arquitetura",
  estrutura: "Estrutura/Estabilidade",
  mep: "Especialidades",
  outro: "Desconhecida",
};

export const FLOOR_LABEL: Record<DetectedFloor, string> = {
  fundacao: "Fundação",
  "piso_-1": "Cave / Piso -1",
  piso_0: "R/C (Piso 0)",
  piso_1: "1º Piso",
  piso_2: "2º Piso",
  cobertura: "Cobertura",
  exterior: "Fachadas/Exterior",
  multi_floor: "Multi-piso",
  generico: "Genérico",
};

/**
 * Aplica override determinístico em cima do resultado da Axia (Gemini).
 * Se a Axia devolve algo com baixa confiança ou inconsistente, este merge corrige.
 */
export function mergeWithHeuristic(
  axia: Partial<SheetClassification>,
  text: string,
): SheetClassification {
  const heur = classifySheetHeuristic(text);
  // Se a heurística tem confiança alta E discorda da Axia, prevalece a heurística.
  if (heur.confidence >= 0.85 && axia.discipline && axia.discipline !== heur.discipline) {
    return heur;
  }
  return {
    discipline: (axia.discipline as SheetDiscipline) ?? heur.discipline,
    sheet_type: (axia.sheet_type as SheetType) ?? heur.sheet_type,
    detected_floor: (axia.detected_floor as DetectedFloor) ?? heur.detected_floor,
    should_extract_quantities: axia.should_extract_quantities ?? heur.should_extract_quantities,
    use_for_validation_only: axia.use_for_validation_only ?? heur.use_for_validation_only,
    confidence: typeof axia.confidence === "number" ? axia.confidence : heur.confidence,
    warnings: [...(axia.warnings ?? []), ...heur.warnings].slice(0, 5),
  };
}

/**
 * Dado o conjunto de páginas classificadas, indica se o projecto contém estrutura.
 */
export function hasStructuralProject(
  pages: Array<{ discipline?: string | null; should_extract_quantities?: boolean | null }>,
): boolean {
  return pages.some(
    (p) => p.discipline === "estrutura" && p.should_extract_quantities !== false,
  );
}

/**
 * Sumário do projeto a partir das páginas classificadas.
 */
export interface ProjectClassificationSummary {
  total: number;
  arquitetura: number;
  estrutura: number;
  has_foundation: boolean;
  has_structural_p0: boolean;
  has_structural_p1: boolean;
  has_reinforcements: boolean;
  has_metallic: boolean;
  floors_detected: string[];
  overall_confidence: number;
}

export function summarizeClassification(
  pages: Array<{
    discipline?: string | null;
    sheet_type?: string | null;
    detected_floor?: string | null;
    classification_confidence?: number | null;
  }>,
): ProjectClassificationSummary {
  const total = pages.length;
  const arquitetura = pages.filter((p) => p.discipline === "arquitetura").length;
  const estrutura = pages.filter((p) => p.discipline === "estrutura").length;

  const has = (t: string) => pages.some((p) => p.sheet_type === t);
  const hasFloor = (f: string) =>
    pages.some((p) => p.discipline === "estrutura" && p.detected_floor === f);

  const floors_detected = Array.from(
    new Set(pages.map((p) => p.detected_floor).filter((f): f is string => !!f && f !== "generico")),
  );

  const confidences = pages
    .map((p) => p.classification_confidence)
    .filter((c): c is number => typeof c === "number");
  const overall_confidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  return {
    total,
    arquitetura,
    estrutura,
    has_foundation: has("foundation_plan") || has("planta_fundacoes"),
    has_structural_p0: hasFloor("piso_0"),
    has_structural_p1: hasFloor("piso_1"),
    has_reinforcements:
      has("reinforcement_detail") ||
      has("armaduras_sapatas") ||
      has("armaduras_vigas") ||
      has("armaduras_lajes") ||
      has("armaduras_paredes") ||
      has("beam_reinforcement") ||
      has("slab_reinforcement") ||
      has("wall_reinforcement"),
    has_metallic: has("metallic_structure_detail") || has("pormenor_metalico"),
    floors_detected,
    overall_confidence,
  };
}
