// Fase 2-5: extração robusta de textos de ficheiros DXF.
// Lê TEXT, MTEXT, ATTRIB, ATTDEF, DIMENSION e textos dentro de BLOCK/INSERT,
// aplicando a transformação composta (posição + escala + rotação) dos inserts.

export type DxfTextEntity =
  | "TEXT"
  | "MTEXT"
  | "ATTRIB"
  | "ATTDEF"
  | "DIMENSION"
  | "INSERT_TEXT";

export interface DxfText {
  raw: string;
  normalized: string;
  layer: string;
  entity_type: DxfTextEntity;
  x: number;
  y: number;
  rotation: number;
  height: number;
  style?: string | null;
  color?: number | null;
  block_source?: string | null;
  confidence: number;
  needs_review: boolean;
  is_text_layer: boolean;
}

export interface DxfDimension {
  raw_text: string | null;
  normalized_text: string | null;
  measured_value: number | null;
  x: number;
  y: number;
  rotation: number;
  layer: string;
  confidence: number;
}

// Layers tipicamente associados a texto (não filtramos por aqui — só anotamos).
const TEXT_LAYER_RE =
  /(^|[_\-\s])(text|texto|anno|annotation|room_?text|compartim|areas?|cotas?|dim|dimensions?|legenda|notes?|arq_?text|a-text|a-anno)([_\-\s]|$)/i;

export function isTextLayer(layer: string | undefined): boolean {
  if (!layer) return false;
  return TEXT_LAYER_RE.test(layer);
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalização de MTEXT / TEXT
// Remove códigos AutoCAD: \P, \~, \f...;, \H...;, \C...;, \L, \O, \\,
// {...}, %%c %%d %%p, e normaliza m² / m³.
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeDxfText(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = String(raw);

  // Códigos de formatação MTEXT do tipo \f...;, \H...;, \C...;, \W...;, \T...;, \A...;, \Q...;, \p...;
  s = s.replace(/\\[fFHCWTAQpL][^;\\]*;/g, "");
  // Comandos sem terminador: \L (sublinhado), \O (overline), \K (strikethrough), \l, \o, \k
  s = s.replace(/\\[LOKlok](?![a-zA-Z0-9])/g, "");
  // Quebras de linha e espaços rígidos
  s = s.replace(/\\P/g, " ");
  s = s.replace(/\\~/g, " ");
  s = s.replace(/\\n/g, " ");
  // Stack fraction \S num^den; → num/den
  s = s.replace(/\\S([^;]*);/g, (_m, g1) => g1.replace(/\^/g, "/"));
  // Caracteres unicode escapados \U+XXXX
  s = s.replace(/\\U\+([0-9a-fA-F]{4})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  // Chaves de grupo {…} (mantém conteúdo)
  s = s.replace(/[{}]/g, "");
  // Escapes restantes: \\ → \
  s = s.replace(/\\\\/g, "\\");
  // Símbolos %% (AutoCAD legacy)
  s = s.replace(/%%[cC]/g, "Ø");
  s = s.replace(/%%[dD]/g, "°");
  s = s.replace(/%%[pP]/g, "±");
  s = s.replace(/%%%/g, "%");
  // m2 / m3 → m² / m³
  s = s.replace(/\bm2\b/gi, "m²");
  s = s.replace(/\bm3\b/gi, "m³");
  // Espaços múltiplos
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformações 2D para resolver INSERT → BLOCK
// ─────────────────────────────────────────────────────────────────────────────
interface Transform {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  rot: number; // radianos
}

const IDENTITY: Transform = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 };

function applyTransform(t: Transform, x: number, y: number): { x: number; y: number } {
  const c = Math.cos(t.rot);
  const s = Math.sin(t.rot);
  const xs = x * t.sx;
  const ys = y * t.sy;
  return {
    x: t.tx + xs * c - ys * s,
    y: t.ty + xs * s + ys * c,
  };
}

function composeTransform(parent: Transform, child: Transform): Transform {
  // child é aplicado em coordenadas locais do parent.
  const p = applyTransform(parent, child.tx, child.ty);
  return {
    tx: p.x,
    ty: p.y,
    sx: parent.sx * child.sx,
    sy: parent.sy * child.sy,
    rot: parent.rot + child.rot,
  };
}

function insertTransform(insert: any, blockBase?: { x: number; y: number }): Transform {
  const pos = insert.position ?? { x: 0, y: 0 };
  const sx = insert.xScale ?? 1;
  const sy = insert.yScale ?? 1;
  const rot = ((insert.rotation ?? 0) * Math.PI) / 180;
  // basePoint do bloco é subtraído antes de aplicar a transformação do insert.
  // Modelamos isso como offset negativo na origem local.
  return {
    tx: pos.x - (blockBase?.x ?? 0) * sx,
    ty: pos.y - (blockBase?.y ?? 0) * sy,
    sx,
    sy,
    rot,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de um único TEXT / MTEXT / ATTRIB / ATTDEF
// ─────────────────────────────────────────────────────────────────────────────
function makeTextFromEntity(
  e: any,
  transform: Transform,
  blockSource: string | null,
): DxfText | null {
  const type = String(e.type || "").toUpperCase();
  if (!["TEXT", "MTEXT", "ATTRIB", "ATTDEF"].includes(type)) return null;

  const raw =
    type === "MTEXT"
      ? (e.text ?? e.string ?? "")
      : type === "ATTRIB" || type === "ATTDEF"
      ? (e.text ?? e.value ?? e.defaultValue ?? "")
      : (e.text ?? "");
  const normalized = normalizeDxfText(raw);
  if (!normalized) return null;

  const sp = e.startPoint ?? e.position ?? e.insertionPoint ?? { x: 0, y: 0 };
  const p = applyTransform(transform, sp.x ?? 0, sp.y ?? 0);

  const rotDeg =
    typeof e.rotation === "number"
      ? e.rotation
      : typeof e.rotationAngle === "number"
      ? e.rotationAngle
      : 0;

  const height =
    typeof e.textHeight === "number"
      ? e.textHeight
      : typeof e.height === "number"
      ? e.height
      : 0;

  // ATTDEF (template inside block definition) costuma ter placeholder; baixa confiança.
  const baseConf = type === "ATTDEF" ? 0.4 : 0.85;

  return {
    raw: String(raw),
    normalized,
    layer: e.layer || "0",
    entity_type: blockSource ? "INSERT_TEXT" : (type as DxfTextEntity),
    x: p.x,
    y: p.y,
    rotation: rotDeg + (transform.rot * 180) / Math.PI,
    height: height * Math.max(Math.abs(transform.sx), Math.abs(transform.sy)),
    style: e.styleName ?? e.textStyle ?? null,
    color: typeof e.color === "number" ? e.color : null,
    block_source: blockSource,
    confidence: baseConf,
    needs_review: type === "ATTDEF",
    is_text_layer: isTextLayer(e.layer),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Expande um INSERT recursivamente, devolvendo todos os textos transformados.
// ─────────────────────────────────────────────────────────────────────────────
const MAX_DEPTH = 5;

function expandInsert(
  insert: any,
  blocksMap: Record<string, any>,
  parentTransform: Transform,
  depth: number,
  out: DxfText[],
): void {
  if (depth > MAX_DEPTH) return;
  const blockName: string = insert.name ?? insert.block ?? "";
  if (!blockName) return;
  const blockDef = blocksMap[blockName];

  const t = composeTransform(
    parentTransform,
    insertTransform(insert, blockDef?.position ?? blockDef?.basePoint ?? { x: 0, y: 0 }),
  );

  // Atributos anexos ao INSERT (preenchidos pelo utilizador no DWG).
  // dxf-parser expõe-os em `attributes`.
  for (const a of insert.attributes ?? []) {
    const txt = makeTextFromEntity(a, t, blockName);
    if (txt) {
      txt.confidence = 0.9; // ATTRIB são fiáveis
      out.push(txt);
    }
  }

  if (!blockDef || !Array.isArray(blockDef.entities)) return;
  for (const inner of blockDef.entities) {
    const innerType = String(inner.type || "").toUpperCase();
    if (["TEXT", "MTEXT", "ATTRIB", "ATTDEF"].includes(innerType)) {
      const txt = makeTextFromEntity(inner, t, blockName);
      if (txt) out.push(txt);
    } else if (innerType === "INSERT") {
      expandInsert(inner, blocksMap, t, depth + 1, out);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API principal
// ─────────────────────────────────────────────────────────────────────────────
export interface DxfExtractionResult {
  texts: DxfText[];
  dimensions: DxfDimension[];
  counts: {
    total_entities: number;
    n_text: number;
    n_mtext: number;
    n_attrib: number;
    n_attdef: number;
    n_dimension: number;
    n_block: number;
    n_insert: number;
    n_texts_from_blocks: number;
    n_texts_extracted: number;
  };
  layers_found: string[];
  layers_text_recognized: string[];
  parse_errors: string[];
}

export function extractDxfTexts(dxf: any): DxfExtractionResult {
  const texts: DxfText[] = [];
  const dimensions: DxfDimension[] = [];
  const counts = {
    total_entities: 0,
    n_text: 0,
    n_mtext: 0,
    n_attrib: 0,
    n_attdef: 0,
    n_dimension: 0,
    n_block: 0,
    n_insert: 0,
    n_texts_from_blocks: 0,
    n_texts_extracted: 0,
  };
  const layersFound = new Set<string>();
  const textLayers = new Set<string>();
  const errors: string[] = [];

  const blocksMap: Record<string, any> = dxf?.blocks ?? {};
  counts.n_block = Object.keys(blocksMap).length;

  const entities: any[] = Array.isArray(dxf?.entities) ? dxf.entities : [];
  counts.total_entities = entities.length;

  for (const e of entities) {
    try {
      const type = String(e.type || "").toUpperCase();
      const layer = e.layer || "0";
      layersFound.add(layer);
      if (isTextLayer(layer)) textLayers.add(layer);

      switch (type) {
        case "TEXT": {
          counts.n_text++;
          const t = makeTextFromEntity(e, IDENTITY, null);
          if (t) texts.push(t);
          break;
        }
        case "MTEXT": {
          counts.n_mtext++;
          const t = makeTextFromEntity(e, IDENTITY, null);
          if (t) texts.push(t);
          break;
        }
        case "ATTRIB": {
          counts.n_attrib++;
          const t = makeTextFromEntity(e, IDENTITY, null);
          if (t) texts.push(t);
          break;
        }
        case "ATTDEF": {
          counts.n_attdef++;
          // ignorados no model space (são templates) — só contam para diagnóstico
          break;
        }
        case "DIMENSION": {
          counts.n_dimension++;
          const raw =
            e.text && e.text !== "<>" && e.text !== ""
              ? e.text
              : e.defaultValue ?? null;
          const measured =
            typeof e.actualMeasurement === "number"
              ? e.actualMeasurement
              : typeof e.measurement === "number"
              ? e.measurement
              : null;
          const ip = e.textMidPoint ?? e.middleOfText ?? e.insertionPoint ?? { x: 0, y: 0 };
          dimensions.push({
            raw_text: raw,
            normalized_text: raw ? normalizeDxfText(raw) : null,
            measured_value: measured,
            x: ip.x ?? 0,
            y: ip.y ?? 0,
            rotation: ((e.rotation ?? 0) * Math.PI) / 180,
            layer,
            confidence: raw ? 0.85 : measured != null ? 0.75 : 0.4,
          });
          break;
        }
        case "INSERT": {
          counts.n_insert++;
          const before = texts.length;
          expandInsert(e, blocksMap, IDENTITY, 0, texts);
          counts.n_texts_from_blocks += texts.length - before;
          break;
        }
      }
    } catch (err) {
      errors.push(`Entity ${e?.type ?? "?"}: ${(err as Error)?.message ?? "erro"}`);
    }
  }

  counts.n_texts_extracted = texts.length;

  return {
    texts,
    dimensions,
    counts,
    layers_found: [...layersFound].sort(),
    layers_text_recognized: [...textLayers].sort(),
    parse_errors: errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classificação heurística do conteúdo do texto
// ─────────────────────────────────────────────────────────────────────────────
export type TextKind =
  | "room_label"
  | "area"
  | "dimension_text"
  | "note"
  | "legend"
  | "unknown";

export interface TextClassification {
  kind: TextKind;
  room_name?: string;
  area_m2?: number;
  value_m?: number;
}

const ROOM_DICT_RE =
  /\b(SALA|COZINHA|QUARTO|SU[ÍI]TE|WC|I\.?\s?S\.?|BANHO|CASA\s+DE\s+BANHO|GARAGEM|LAVANDARIA|HALL|ENTRADA|ESCRIT[ÓO]RIO|DESPENSA|VARANDA|TERRA[ÇC]O|ARRUMOS?|CIRCULA[ÇC][ÃA]O|SOT[ÃA]O|SALA\s+COMUM|JANTAR|ESTAR)\b/i;

export function classifyText(text: string): TextClassification {
  const t = text.trim();
  if (!t) return { kind: "unknown" };

  const areaMatch = t.match(/([\d]+[.,]?[\d]*)\s*m\s*[²2]/i);
  if (areaMatch) {
    return {
      kind: "area",
      area_m2: Number(areaMatch[1].replace(",", ".")),
    };
  }

  const roomMatch = t.match(ROOM_DICT_RE);
  if (roomMatch) {
    return { kind: "room_label", room_name: t.replace(/\s+/g, " ") };
  }

  const linearMatch = t.match(/^([\d]+[.,]?[\d]*)\s*(m|cm|mm)\b/i);
  if (linearMatch) {
    const v = Number(linearMatch[1].replace(",", "."));
    const unit = linearMatch[2].toLowerCase();
    const m = unit === "mm" ? v / 1000 : unit === "cm" ? v / 100 : v;
    return { kind: "dimension_text", value_m: m };
  }

  if (t.length > 40) return { kind: "note" };
  return { kind: "unknown" };
}
