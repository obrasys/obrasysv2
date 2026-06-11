/**
 * Heurísticas offline para classificar folhas de plantas (arquitetura vs estrutura)
 * a partir do título / código de desenho / texto OCR.
 * Usado como fallback / pré-classificação antes da Axia (Gemini 2.5 Pro).
 */

export type SheetDiscipline = "arquitetura" | "estrutura" | "mep" | "outro";

export type SheetType =
  | "planta_fundacoes"
  | "armaduras_sapatas"
  | "quadro_pilares"
  | "planta_estrutural"
  | "armaduras_vigas"
  | "armaduras_lajes"
  | "armaduras_paredes"
  | "pormenor_icf"
  | "pormenor_metalico"
  | "planta_arquitetura"
  | "alcado"
  | "corte"
  | "cobertura"
  | "outro";

export type DetectedFloor =
  | "fundacao"
  | "piso_-1"
  | "piso_0"
  | "piso_1"
  | "piso_2"
  | "cobertura"
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
 * Classifica uma folha (página) a partir do texto disponível (título + código + OCR).
 */
export function classifySheetHeuristic(text: string): SheetClassification {
  const t = norm(text);
  const warnings: string[] = [];

  // --- Disciplina + tipo ---
  let discipline: SheetDiscipline = "arquitetura";
  let sheet_type: SheetType = "planta_arquitetura";
  let confidence = 0.5;

  const isStructural = matchAny(t, [
    /\bfunda[cç][oõã]es?\b/, /\bsapatas?\b/, /\bpilares?\b/, /\barmadura/, /\bvigas?\b/,
    /\blajes?\b/, /\bpared(es)?\s+estrutur/, /\bestrutur/, /\bbet[aã]o\s+armado/,
    /\bporticos?\b/, /\bperfis?\s+metalic/, /\bicf\b.*pormenor|pormenor.*icf/,
    /\bheb\b|\bipe\b|\bhea\b/, /\bquadro\s+de\s+pilares/, /\bestabilidade\b/,
  ]);

  if (isStructural) {
    discipline = "estrutura";
    confidence = 0.7;
    if (/funda[cç][oõã]es?/.test(t)) sheet_type = "planta_fundacoes";
    else if (/armadur.*sapata|sapata.*armadur/.test(t)) sheet_type = "armaduras_sapatas";
    else if (/quadro\s+de\s+pilar|pilares?/.test(t)) sheet_type = "quadro_pilares";
    else if (/armadur.*viga|viga.*armadur/.test(t)) sheet_type = "armaduras_vigas";
    else if (/armadur.*laje|laje.*armadur/.test(t)) sheet_type = "armaduras_lajes";
    else if (/armadur.*pared|pared.*armadur/.test(t)) sheet_type = "armaduras_paredes";
    else if (/pormenor.*metal|liga[cç][oõã]es?\s+metalic/.test(t)) sheet_type = "pormenor_metalico";
    else if (/pormenor.*icf|icf.*pormenor/.test(t)) sheet_type = "pormenor_icf";
    else sheet_type = "planta_estrutural";
  } else if (matchAny(t, [/\balc[ae]ado/, /\balcad/])) {
    sheet_type = "alcado";
    confidence = 0.75;
  } else if (/\bcorte/.test(t)) {
    sheet_type = "corte";
    confidence = 0.75;
  } else if (/\bcobertura/.test(t)) {
    sheet_type = "cobertura";
    confidence = 0.7;
  } else if (matchAny(t, [/planta.*(arquitet|r\s*\/?\s*c|res-do-chao|res do chao|piso|andar)/])) {
    sheet_type = "planta_arquitetura";
    confidence = 0.65;
  }

  // --- Piso ---
  let detected_floor: DetectedFloor = "generico";
  if (sheet_type === "planta_fundacoes" || /funda[cç][oõã]/.test(t)) detected_floor = "fundacao";
  else if (/cobertura/.test(t)) detected_floor = "cobertura";
  else if (/\bcave\b|\bpiso\s*-?\s*1\b|\bsub\s*-?\s*solo\b/.test(t)) detected_floor = "piso_-1";
  else if (/\b(r\s*\/?\s*c|res\s*-?\s*do\s*-?\s*chao|piso\s*0|t[eé]rreo)\b/.test(t)) detected_floor = "piso_0";
  else if (/\b(1[ºo°]?\s*(andar|piso)|piso\s*1)\b/.test(t)) detected_floor = "piso_1";
  else if (/\b(2[ºo°]?\s*(andar|piso)|piso\s*2)\b/.test(t)) detected_floor = "piso_2";

  // --- Flags ---
  const use_for_validation_only = ["alcado", "corte", "pormenor_icf", "pormenor_metalico"].includes(sheet_type);
  const should_extract_quantities = !use_for_validation_only;

  if (!text || text.trim().length < 4) {
    warnings.push("Texto da folha insuficiente para classificação fiável.");
    confidence = Math.min(confidence, 0.4);
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
  planta_fundacoes: "Planta de Fundações",
  armaduras_sapatas: "Armaduras de Sapatas",
  quadro_pilares: "Quadro de Pilares",
  planta_estrutural: "Planta Estrutural",
  armaduras_vigas: "Armaduras de Vigas",
  armaduras_lajes: "Armaduras de Lajes",
  armaduras_paredes: "Armaduras de Paredes",
  pormenor_icf: "Pormenor ICF",
  pormenor_metalico: "Pormenor Metálico",
  planta_arquitetura: "Planta de Arquitetura",
  alcado: "Alçado",
  corte: "Corte",
  cobertura: "Cobertura",
  outro: "Outro",
};

export const DISCIPLINE_LABEL: Record<SheetDiscipline, string> = {
  arquitetura: "Arquitetura",
  estrutura: "Estrutura/Estabilidade",
  mep: "Especialidades",
  outro: "Outro",
};

export const FLOOR_LABEL: Record<DetectedFloor, string> = {
  fundacao: "Fundação",
  "piso_-1": "Cave / Piso -1",
  piso_0: "R/C (Piso 0)",
  piso_1: "1º Piso",
  piso_2: "2º Piso",
  cobertura: "Cobertura",
  generico: "Genérico",
};

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
